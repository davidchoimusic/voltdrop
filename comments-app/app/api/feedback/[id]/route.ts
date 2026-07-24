import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { containsLink } from '@/lib/link-blocking'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    await prisma.feedback.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete feedback:', error)
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 })
  }
}

// PATCH: Edit comment content (owner or admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const content = body.content?.trim()

  // Validation
  if (!content || content.length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: 'Content must be 2000 characters or less' }, { status: 400 })
  }
  if (containsLink(content)) {
    return NextResponse.json({ error: 'Links are not allowed' }, { status: 400 })
  }
  if (/[\r\n]/.test(content)) {
    return NextResponse.json({ error: 'Line breaks are not allowed' }, { status: 400 })
  }

  const isAdmin = session.user.isAdmin

  // Conditional update: admin can edit any, non-admin can only edit own non-hidden comments
  const where = isAdmin
    ? { id, isHidden: false }
    : { id, isHidden: false, userId: session.user.id }

  const result = await prisma.feedback.updateMany({
    where,
    data: { content },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: 'Comment not found or not editable' }, { status: 404 })
  }

  // Fetch the updated record to return
  const data = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      createdAt: true,
      authorName: true,
      authorImage: true,
      parentId: true,
      userId: true,
    },
  })

  if (!data) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
  }

  return NextResponse.json({
    feedback: {
      id: data.id,
      content: data.content,
      created_at: data.createdAt.toISOString(),
      author_name: data.authorName,
      author_image: data.authorImage,
      parent_id: data.parentId,
      user_id: data.userId,
    },
  })
}
