import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { containsLink } from '@/lib/link-blocking'

// Prevent stale cache
export const dynamic = 'force-dynamic'

type FeedbackRow = {
  id: string
  content: string
  createdAt: Date
  authorName: string
  authorImage: string | null
  parentId: string | null
  userId: string
}

// Map Prisma camelCase to snake_case for frontend compatibility
function toSnakeCase(row: FeedbackRow) {
  return {
    id: row.id,
    content: row.content,
    created_at: row.createdAt.toISOString(),
    author_name: row.authorName,
    author_image: row.authorImage,
    parent_id: row.parentId,
    user_id: row.userId,
  }
}

const FEEDBACK_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  authorName: true,
  authorImage: true,
  parentId: true,
  userId: true,
} satisfies Prisma.FeedbackSelect

// GET: Fetch visible feedback (public), paginated over TOP-LEVEL comments.
// Replies always ride along with their parent, so a page never splits a thread.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Prisma requires integer skip/take — reject NaN, fractions, and negatives.
  const rawLimit = Number(searchParams.get('limit') ?? '20')
  const limit = Number.isSafeInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20
  const rawOffset = Number(searchParams.get('offset') ?? '0')
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0

  try {
    // Fetch one page of top-level comments + the total count for pagination
    const [topLevel, total] = await Promise.all([
      prisma.feedback.findMany({
        where: { isHidden: false, parentId: null },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: FEEDBACK_SELECT,
      }),
      prisma.feedback.count({ where: { isHidden: false, parentId: null } }),
    ])

    // Fetch all replies for these top-level comments in one query
    const parentIds = topLevel.map(c => c.id)
    let replies: typeof topLevel = []
    if (parentIds.length > 0) {
      replies = await prisma.feedback.findMany({
        where: { isHidden: false, parentId: { in: parentIds } },
        orderBy: { createdAt: 'asc' },
        select: FEEDBACK_SELECT,
      })
    }

    // Group replies under their parents
    const replyMap = new Map<string, typeof replies>()
    for (const reply of replies) {
      const list = replyMap.get(reply.parentId!) || []
      list.push(reply)
      replyMap.set(reply.parentId!, list)
    }

    const feedback = topLevel.map(comment => ({
      ...toSnakeCase(comment),
      replies: (replyMap.get(comment.id) || []).map(toSnakeCase),
    }))

    return NextResponse.json(
      { feedback, total },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}

// POST: Create new feedback (auth required)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const content = body.content?.trim()
  // Never trust a client-supplied name: only the session-derived variants the
  // privacy picker offers (full / first / "First L.") or Anonymous. A forged
  // request with an arbitrary displayName falls back to the session name.
  const sessionName = (session.user.name || '').trim()
  const allowedNames = new Set(['Anonymous'])
  if (sessionName) {
    const parts = sessionName.split(/\s+/)
    const firstName = parts[0]
    const lastName = parts.length > 1 ? parts[parts.length - 1] : ''
    allowedNames.add(sessionName)
    allowedNames.add(firstName)
    if (lastName) allowedNames.add(`${firstName} ${lastName[0]}.`)
  }
  const requestedName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  const displayName = (allowedNames.has(requestedName)
    ? requestedName
    : sessionName || 'Anonymous'
  ).slice(0, 80)
  const showPhoto = body.showPhoto !== false // Default to true
  const parentId = body.parent_id || null

  // If replying, enforce admin-only
  if (parentId) {
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate parent exists, is visible, and is top-level (single-level replies only)
    const parent = await prisma.feedback.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true, isHidden: true },
    })

    if (!parent) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 })
    }
    if (parent.isHidden) {
      return NextResponse.json({ error: 'Cannot reply to a hidden comment' }, { status: 400 })
    }
    if (parent.parentId !== null) {
      return NextResponse.json({ error: 'Cannot reply to a reply' }, { status: 400 })
    }
  }

  // Validation
  if (!content || content.length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: 'Content must be 2000 characters or less' }, { status: 400 })
  }

  // Link blocking
  if (containsLink(content)) {
    return NextResponse.json({ error: 'Links are not allowed in feedback' }, { status: 400 })
  }

  // Block line breaks
  if (/[\r\n]/.test(content)) {
    return NextResponse.json({ error: 'Line breaks are not allowed in feedback' }, { status: 400 })
  }

  // Rate limiting: max 1 post per hour per user (skip for admin replies only)
  const isAdminReply = parentId && session.user.isAdmin
  if (!isAdminReply) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const count = await prisma.feedback.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (count >= 1) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 1 post per hour.' }, { status: 429 })
    }
  }

  try {
    // Insert feedback with denormalized author data (respecting privacy preferences)
    const data = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        content,
        authorName: displayName,
        authorImage: showPhoto ? (session.user.image || null) : null,
        parentId: parentId,
      },
      select: FEEDBACK_SELECT,
    })

    return NextResponse.json({ feedback: toSnakeCase(data) }, { status: 201 })
  } catch (error) {
    console.error('Failed to create feedback:', error)
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
  }
}
