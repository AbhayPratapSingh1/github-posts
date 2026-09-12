import { useState, useRef, useEffect } from "react"
import { FaTrash, FaEdit, FaSave, FaTimes, FaReply, FaHeart } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { createComment, updateComment, deleteComment, likeComment } from "../api/posts"
import { Link, useLocation } from "react-router-dom"

function Comment({
  comment,
  currentUser,
  isAdmin,
  postId,
  onDelete,
  onUpdate,
  onReply,
  onLike,
  depth = 0,
}) {
  const {
    content,
    username,
    name,
    avatar_url,
    created_at,
    user_id,
    is_deleted,
    updated_at,
    parent_id,
    like_count,
    liked_by_me,
    replies = [],
  } = comment
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content || "")
  const [replying, setReplying] = useState(false)
  const [replyDraft, setReplyDraft] = useState("")
  const displayName = name || username || "User"
  const githubUsername = username

  useEffect(() => {
    if (!editing) setDraft(content || "")
  }, [content, editing])

  const githubUrl = githubUsername
    ? `https://github.com/${githubUsername}`
    : null

  const canManage =
    currentUser &&
    (isAdmin || currentUser.id === user_id) &&
    !is_deleted

  const edited = !is_deleted && updated_at && updated_at !== created_at

  const saveEdit = async () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    await onUpdate(comment.id, trimmed)
    setEditing(false)
  }

  const cancelEdit = () => {
    setDraft(content || "")
    setEditing(false)
  }

  const submitReply = async () => {
    const trimmed = replyDraft.trim()
    if (!trimmed) return
    await onReply(comment.id, trimmed)
    setReplyDraft("")
    setReplying(false)
  }

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return "just now"
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "yesterday"
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  return (
    <div className={`${depth > 0 ? "ml-8 border-l-2 border-bg-200 dark:border-bg-700" : ""}`}>
      <div className="border-b border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-800 dark:bg-bg-900">
        <div className="flex items-start gap-3">
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt={displayName}
                  className="size-8 rounded-full object-cover transition-opacity hover:opacity-80"
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </a>
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            {is_deleted ? (
              <p className="text-sm leading-relaxed italic text-fg-500 dark:text-fg-400">
                This comment was deleted.
              </p>
            ) : editing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={200}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-bg-300 bg-bg-50 px-3 py-1.5 text-sm outline-none focus:border-primary-500 dark:border-bg-700 dark:bg-bg-800"
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!draft.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <FaSave />
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-bg-300 px-3 py-1.5 text-xs font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-fg-800 dark:text-fg-200">
                  {content}
                </p>
                {parent_id && !comment._parentAuthor && (
                  <p className="mt-1 text-xs text-fg-400 dark:text-fg-500">
                    Reply
                  </p>
                )}
              </>
            )}

            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {githubUrl ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-fg-700 hover:text-primary-600 hover:underline dark:text-fg-300 dark:hover:text-primary-400"
                >
                  {displayName}
                </a>
              ) : (
                <span className="font-medium text-fg-700 dark:text-fg-300">
                  {displayName}
                </span>
              )}

              <span className="text-fg-400">·</span>

              <span
                className="text-fg-500 dark:text-fg-400"
                title={new Date(created_at).toLocaleString()}
              >
                {getRelativeTime(created_at)}
              </span>

              {edited && (
                <span className="text-fg-500 dark:text-fg-400">
                  · edited
                </span>
              )}
            </div>
          </div>

          {!is_deleted && currentUser && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onLike(comment.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors ${
                  liked_by_me
                    ? "text-red-500 hover:text-red-600"
                    : "text-fg-500 hover:text-red-500 dark:text-fg-400"
                }`}
              >
                <FaHeart className={liked_by_me ? "fill-current" : ""} />
                {like_count > 0 && <span>{like_count}</span>}
              </button>

              {!parent_id && depth === 0 && (
                <button
                  type="button"
                  onClick={() => setReplying(!replying)}
                  className="rounded-md p-2 text-fg-500 transition-colors hover:bg-bg-200 hover:text-primary-600 dark:text-fg-400 dark:hover:bg-bg-800 dark:hover:text-primary-400"
                >
                  <FaReply className="size-3.5" />
                </button>
              )}

              {canManage && (
                <>
                  {currentUser.id === user_id && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="rounded-md p-2 text-fg-500 transition-colors hover:bg-bg-200 hover:text-primary-600 dark:text-fg-400 dark:hover:bg-bg-800 dark:hover:text-primary-400"
                    >
                      <FaEdit className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="rounded-md p-2 text-fg-500 transition-colors hover:bg-bg-200 hover:text-red-600 dark:text-fg-400 dark:hover:bg-bg-800 dark:hover:text-red-400"
                  >
                    <FaTrash className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          )}

          {!currentUser && !is_deleted && (
            <div className="flex shrink-0 items-center gap-1">
              <span className="flex items-center gap-1 px-2 py-1.5 text-xs text-fg-400">
                <FaHeart className="size-3" />
                {like_count > 0 && <span>{like_count}</span>}
              </span>
            </div>
          )}
        </div>

        {replying && (
          <div className="mt-3 flex gap-2 pl-11">
            <input
              type="text"
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={`Reply to ${displayName}...`}
              maxLength={200}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-bg-300 bg-bg-50 px-3 py-1.5 text-sm outline-none focus:border-primary-500 dark:border-bg-700 dark:bg-bg-800"
              onKeyDown={(e) => { if (e.key === "Enter") submitReply() }}
            />
            <button
              type="button"
              onClick={submitReply}
              disabled={!replyDraft.trim()}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => { setReplying(false); setReplyDraft("") }}
              className="rounded-lg border border-bg-300 px-3 py-1.5 text-xs font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div>
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              isAdmin={isAdmin}
              postId={postId}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onReply={onReply}
              onLike={onLike}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentsSection({
  postId,
  comments,
  setComments,
  isLoading,
}) {
  const [input, setInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const createSeqRef = useRef(0)

  const { user } = useAuth()
  const { addToast } = useToast()
  const location = useLocation()

  const isAdmin = Boolean(user?.is_admin) || Boolean(localStorage.getItem("admin_token"))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || submitting) return

    const tempId = `temp-${++createSeqRef.current}-${Date.now()}`
    const optimisticComment = {
      id: tempId,
      content: trimmed,
      user_id: user.id,
      username: user.username,
      name: user.name,
      avatar_url: user.avatar_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      parent_id: null,
      like_count: 0,
      liked_by_me: false,
      replies: [],
      _optimistic: true,
    }

    setInput("")
    setSubmitting(true)
    setComments((prev) => [...prev, optimisticComment])

    try {
      const realComment = await createComment(postId, trimmed)
      setComments((prev) =>
        prev.map((c) => c.id === tempId ? { ...realComment, replies: [], _optimistic: false } : c)
      )
      addToast("Comment posted", "success")
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      addToast("Failed to post comment", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return

    const prevComments = JSON.parse(JSON.stringify(comments))
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, is_deleted: true, content: "" }
        return { ...c, replies: c.replies?.map((r) =>
          r.id === commentId ? { ...r, is_deleted: true, content: "" } : r
        ) || [] }
      })
    )

    try {
      const res = await deleteComment(postId, commentId)
      if (res?.comment) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) return res.comment
            return { ...c, replies: c.replies?.map((r) =>
              r.id === commentId ? res.comment : r
            ) || [] }
          })
        )
      }
      addToast("Comment deleted", "success")
    } catch (err) {
      setComments(prevComments)
      addToast(err.message || "Failed to delete comment", "error")
    }
  }

  const handleUpdate = async (commentId, newContent) => {
    if (!newContent.trim()) return

    const prevComments = JSON.parse(JSON.stringify(comments))
    const updateCommentInList = (list) =>
      list.map((c) => {
        if (c.id === commentId) return { ...c, content: newContent, updated_at: new Date().toISOString() }
        return { ...c, replies: c.replies ? updateCommentInList(c.replies) : [] }
      })

    setComments((prev) => updateCommentInList(prev))

    try {
      const updated = await updateComment(postId, commentId, newContent)
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) return updated
          return { ...c, replies: c.replies?.map((r) =>
            r.id === commentId ? updated : r
          ) || [] }
        })
      )
      addToast("Comment updated", "success")
    } catch (err) {
      setComments(prevComments)
      addToast(err.message || "Failed to update comment", "error")
    }
  }

  const handleReply = async (parentId, content) => {
    const tempId = `temp-reply-${++createSeqRef.current}-${Date.now()}`
    const optimisticReply = {
      id: tempId,
      content,
      user_id: user.id,
      username: user.username,
      name: user.name,
      avatar_url: user.avatar_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      parent_id: parentId,
      like_count: 0,
      liked_by_me: false,
      replies: [],
      _optimistic: true,
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies || []), optimisticReply] }
          : c
      )
    )

    try {
      const realReply = await createComment(postId, content, parentId)
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === tempId ? { ...realReply, replies: [], _optimistic: false } : r
              ),
            }
          }
          return c
        })
      )
      addToast("Reply posted", "success")
    } catch {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return { ...c, replies: c.replies.filter((r) => r.id !== tempId) }
          }
          return c
        })
      )
      addToast("Failed to post reply", "error")
    }
  }

  const handleLike = async (commentId) => {
    if (!user) return addToast("Sign in to like comments", "error")

    const prevComments = JSON.parse(JSON.stringify(comments))

    const toggleLikeInList = (list) =>
      list.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            liked_by_me: !c.liked_by_me,
            like_count: c.liked_by_me ? c.like_count - 1 : c.like_count + 1,
          }
        }
        return { ...c, replies: c.replies ? toggleLikeInList(c.replies) : [] }
      })

    setComments((prev) => toggleLikeInList(prev))

    try {
      const res = await likeComment(postId, commentId)
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, liked_by_me: res.liked, like_count: res.like_count }
          }
          return { ...c, replies: c.replies?.map((r) => {
            if (r.id === commentId) return { ...r, liked_by_me: res.liked, like_count: res.like_count }
            return r
          }) || [] }
        })
      )
    } catch {
      setComments(prevComments)
    }
  }

  return (
    <div className="space-y-5">
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-bg-200 bg-bg-100 p-3 dark:border-bg-800 dark:bg-bg-900"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a comment..."
              maxLength={200}
              className="min-w-0 flex-1 rounded-lg border border-bg-300 bg-bg-50 px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-bg-700 dark:bg-bg-800"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-800 dark:bg-bg-900">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg-900 dark:text-fg-100">
              Want to join the discussion?
            </p>
            <p className="mt-0.5 text-xs text-fg-500 dark:text-fg-400">
              Sign in to leave a comment.
            </p>
          </div>
          <Link
            to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}#comments`}
            className="shrink-0 rounded-lg bg-bg-900 px-4 py-2 text-sm font-semibold text-bg-50 hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
          >
            Sign in
          </Link>
        </div>
      )}

      {isLoading && comments.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-500 dark:text-fg-400">
          Loading comments...
        </p>
      )}

      {comments.length === 0 && !isLoading && (
        <div className="rounded-xl border border-dashed border-bg-300 py-10 text-center dark:border-bg-700">
          <p className="text-sm font-medium text-fg-700 dark:text-fg-300">
            No comments yet
          </p>
          <p className="mt-1 text-sm text-fg-500 dark:text-fg-400">
            Be the first to join the discussion!
          </p>
        </div>
      )}

      {comments.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-bg-200 dark:border-bg-800">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              currentUser={user}
              isAdmin={isAdmin}
              postId={postId}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onReply={handleReply}
              onLike={handleLike}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentsSection
