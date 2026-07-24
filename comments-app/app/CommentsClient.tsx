'use client'

/* VoltDrop comments — ported from pitchchanger.io's FeedbackClient.
   Sign in with Google/Facebook, privacy name picker, 1 post/hour,
   admin replies + delete, owner edit. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type Comment = {
  id: string
  content: string
  created_at: string
  author_name: string
  author_image: string | null
  parent_id: string | null
  user_id: string
  replies?: Comment[]
}

const PAGE_SIZE = 20
const API = '/comments/api/feedback'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function nameChoices(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const out: string[] = []
  if (parts.length) {
    out.push(fullName.trim())
    if (parts.length > 1) out.push(`${parts[0]} ${parts[parts.length - 1][0]}.`)
    out.push(parts[0])
  }
  out.push('Anonymous')
  return [...new Set(out)]
}

export default function CommentsClient() {
  const { data: session, status } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPhoto, setShowPhoto] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const isAdmin = !!session?.user?.isAdmin
  const myId = session?.user?.id

  useEffect(() => {
    if (session?.user?.name && !displayName) setDisplayName(session.user.name)
  }, [session, displayName])

  const load = useCallback(async (offset = 0) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}?limit=${PAGE_SIZE}&offset=${offset}`, { cache: 'no-store' })
      const data = await res.json()
      setComments(prev => (offset === 0 ? data.feedback : [...prev, ...data.feedback]))
      setTotal(data.total)
    } catch {
      setError('Could not load comments. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(0) }, [load])

  async function post(parentId: string | null, text: string) {
    setPosting(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text.replace(/[\r\n]+/g, ' ').trim(),
          displayName,
          showPhoto,
          parent_id: parentId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(res.status === 429
          ? 'Easy there — one comment per hour. Come back in a bit!'
          : data.error || 'Could not post. Try again.')
        return false
      }
      setNotice('Posted — thanks!')
      await load(0)
      return true
    } catch {
      setError('Could not post. Check your connection and try again.')
      return false
    } finally {
      setPosting(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this comment?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE' })
    await load(0)
  }

  async function saveEdit(id: string) {
    const res = await fetch(`${API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editText.replace(/[\r\n]+/g, ' ').trim() }),
    })
    if (res.ok) {
      setEditingId(null)
      await load(0)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Could not save the edit.')
    }
  }

  function CommentCard({ c, isReply }: { c: Comment; isReply?: boolean }) {
    const mine = myId && c.user_id === myId
    return (
      <div className={`comment ${isReply ? 'reply' : ''}`}>
        <div className="comment-head">
          {c.author_image
            ? <img className="avatar" src={c.author_image} alt="" width={34} height={34} referrerPolicy="no-referrer" />
            : <span className="avatar avatar-fallback" aria-hidden="true">{(c.author_name || 'A')[0].toUpperCase()}</span>}
          <span className="author">{c.author_name}</span>
          <span className="when">{timeAgo(c.created_at)}</span>
          <span className="spacer" />
          {(isAdmin || mine) && editingId !== c.id && (
            <button className="mini-btn" onClick={() => { setEditingId(c.id); setEditText(c.content) }}>Edit</button>
          )}
          {isAdmin && <button className="mini-btn danger" onClick={() => remove(c.id)}>Delete</button>}
        </div>
        {editingId === c.id ? (
          <div className="edit-box">
            <textarea value={editText} onChange={e => setEditText(e.target.value)} maxLength={2000} rows={2} />
            <div className="edit-actions">
              <button className="mini-btn" onClick={() => saveEdit(c.id)}>Save</button>
              <button className="mini-btn" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <p className="comment-body">{c.content}</p>
        )}
        {!isReply && isAdmin && replyTo !== c.id && (
          <button className="mini-btn" onClick={() => { setReplyTo(c.id); setReplyText('') }}>Reply</button>
        )}
        {replyTo === c.id && (
          <div className="edit-box">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Reply as VoltDrop…"
            />
            <div className="edit-actions">
              <button className="mini-btn" disabled={posting || !replyText.trim()}
                onClick={async () => { if (await post(c.id, replyText)) setReplyTo(null) }}>
                Post reply
              </button>
              <button className="mini-btn" onClick={() => setReplyTo(null)}>Cancel</button>
            </div>
          </div>
        )}
        {c.replies?.map(r => <CommentCard key={r.id} c={r} isReply />)}
      </div>
    )
  }

  return (
    <main className="comments-main">

      <section className="card composer">
        <h1 className="tool-title">💬 Leave feedback</h1>
        <p className="tool-sub">Found a bug? Want a feature? Did a calculation save your bacon? Tell us — we read everything.</p>

        {status === 'loading' && <p className="hint">Checking sign-in…</p>}

        {status === 'unauthenticated' && (
          <div className="signin-row">
            <p className="hint">Sign in to comment — it keeps the spam robots out. We never post on your behalf.</p>
            <div className="signin-buttons">
              <button className="signin-btn google" onClick={() => signIn('google')}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign in with Google
              </button>
              <button className="signin-btn facebook" onClick={() => signIn('facebook')}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Sign in with Facebook
              </button>
            </div>
          </div>
        )}

        {status === 'authenticated' && session?.user && (
          <>
            <div className="session-row">
              <span className="hint">Signed in as <strong>{session.user.name || session.user.email}</strong></span>
              <button className="mini-btn" onClick={() => signOut()}>Sign out</button>
            </div>

            <div className="privacy-row">
              <span className="privacy-label">Show my name as:</span>
              {nameChoices(session.user.name || '').map(n => (
                <button key={n} type="button"
                  className={`name-chip ${displayName === n || (!displayName && n === session.user.name) ? 'active' : ''}`}
                  onClick={() => setDisplayName(n)}>
                  {n}
                </button>
              ))}
              <label className="photo-toggle">
                <input type="checkbox" checked={showPhoto} onChange={e => setShowPhoto(e.target.checked)} />
                Show my photo
              </label>
            </div>

            <textarea
              ref={composerRef}
              className="composer-input"
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="What's working? What's confusing? What should we build next?"
            />
            <div className="composer-actions">
              <span className="hint">{content.length}/2000 · no links · one comment per hour</span>
              <button className="calc-btn post-btn" disabled={posting || !content.trim()}
                onClick={async () => { if (await post(null, content)) setContent('') }}>
                {posting ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </>
        )}

        {error && <p className="msg error-msg" role="alert">{error}</p>}
        {notice && !error && <p className="msg ok-msg">{notice}</p>}
      </section>

      <section className="comment-list">
        <h2 className="list-head">{total} comment{total === 1 ? '' : 's'}</h2>
        {comments.map(c => <CommentCard key={c.id} c={c} />)}
        {loading && <p className="hint">Loading…</p>}
        {!loading && comments.length === 0 && (
          <p className="hint empty">No comments yet — be the first. 🏗️</p>
        )}
        {!loading && comments.length < total && (
          <button className="mini-btn load-more" onClick={() => load(comments.length)}>
            Load more
          </button>
        )}
      </section>

    </main>
  )
}
