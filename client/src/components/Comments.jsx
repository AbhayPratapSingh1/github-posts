import { useState } from "react"
import { FaTrash, FaEdit, FaSave, FaTimes } from "react-icons/fa"
import { API_BASE } from "../api/client"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { getPostCommentById, updateComment, deleteComment } from "../api/posts"
import { Link, useLocation } from "react-router-dom"
import Tooltip from "./Tooltip"

function Comment({
  comment,
  currentUser,
  isAdmin,
  onDelete,
  onUpdate,
}) {
  const {
    content,
    username,
    name,
    github_id,
    avatar_url,
    created_at,
    user_id,
    is_deleted,
    updated_at,
  } = comment
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content || "")
  const displayName = name || username || "User"
  const githubUsername = username || github_id

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

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) {
      return "just now"
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)

    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInDays === 1) {
      return "yesterday"
    }

    if (diffInDays < 7) {
      return `${diffInDays}d ago`
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  return (
    <div className="border-b border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-800 dark:bg-bg-900">
      <div className="flex items-start gap-3">
        {/* Profile Avatar */}
        {githubUrl ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
            aria-label={`View ${displayName}'s GitHub profile`}
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
          {/* Comment */}
          {is_deleted ? (
            <p className="text-sm leading-relaxed italic text-fg-500 dark:text-fg-400">
              This comment was deleted by an admin.
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
              <Tooltip tip="save" side="bottom">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!draft.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <FaSave />
                  Save
                </button>
              </Tooltip>
              <Tooltip tip="cancelEdit" side="bottom">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-bg-300 px-3 py-1.5 text-xs font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
                >
                  <FaTimes />
                  Cancel
                </button>
              </Tooltip>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-fg-800 dark:text-fg-200">
              {content}
            </p>
          )}

          {/* Author + Time */}
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

            {githubUsername && (
              <>
                <span className="text-fg-400">·</span>
                <span className="text-fg-500 dark:text-fg-400">
                  @{githubUsername}
                </span>
              </>
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

        {/* Actions */}
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            {currentUser.id === user_id && (
              <Tooltip tip="editComment">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit comment"
                  className="rounded-md p-2 text-fg-500 transition-colors hover:bg-bg-200 hover:text-primary-600 dark:text-fg-400 dark:hover:bg-bg-800 dark:hover:text-primary-400"
                >
                  <FaEdit className="size-3.5" />
                </button>
              </Tooltip>
            )}
            <Tooltip tip="deleteComment" side="right">
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                aria-label="Delete comment"
                className="rounded-md p-2 text-fg-500 transition-colors hover:bg-bg-200 hover:text-red-600 dark:text-fg-400 dark:hover:bg-bg-800 dark:hover:text-red-400"
              >
                <FaTrash className="size-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}
function CommentsSection({
  postId,
  comments,
  setComments,
  isLoading,
  hasMoreComments,
}) {
  const [input, setInput] = useState("")
  const [postHasMoreComments, setPostHasMoreComments] =
    useState(hasMoreComments)

  const { user } = useAuth()
  const { addToast } = useToast()
  const location = useLocation();

  const isAdmin = Boolean(user?.is_admin) || Boolean(localStorage.getItem("admin_token"))

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) return

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${
            localStorage.getItem("session_token") ||
            localStorage.getItem("admin_token")
          }`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      })

      if (res.ok) {
        setInput("")

        const data = await res.json()

        setComments((prev) => [data, ...prev])

        addToast("Comment posted", "success")
      } else {
        const err = await res.json()
        addToast(err.error || "Failed to post comment", "error")
      }
    } catch {
      addToast("Network error", "error")
    }
  }

  const loadMore = async () => {
    try {
      const allComments = await getPostCommentById(postId)

      setComments(allComments)
      setPostHasMoreComments(false)
    } catch {
      addToast("Failed to load comments", "error")
    }
  }

  const handleDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return

    try {
      const res = await deleteComment(postId, commentId)

      if (res?.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? res.comment : c))
        )
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }

      addToast("Comment deleted", "success")
    } catch (err) {
      addToast(err.message || "Failed to delete comment", "error")
    }
  }

  const handleUpdate = async (commentId, newContent) => {
    if (!newContent.trim()) return

    try {
      const updated = await updateComment(postId, commentId, newContent)
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      )
      addToast("Comment updated", "success")
    } catch (err) {
      addToast(err.message || "Failed to update comment", "error")
    }
  }

  return (
    <div className="space-y-5">
      {/* Comment Form / Sign In */}
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

            <Tooltip tip="postComment" side="bottom">
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Post
            </button>
          </Tooltip>
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

          <Tooltip tip="signIn">
          <Link
            to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}#comments`}
            className="shrink-0 rounded-lg bg-bg-900 px-4 py-2 text-sm font-semibold text-bg-50 hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
          >
            Sign in
          </Link>
        </Tooltip>

        </div>
      )}

      {/* Loading */}
      {isLoading && comments.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-500 dark:text-fg-400">
          Loading comments...
        </p>
      )}

      {/* Empty */}
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

      {/* Comments */}
      {comments.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-bg-200 dark:border-bg-800">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              currentUser={user}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {/* See all comments */}
      {!isLoading && postHasMoreComments && (
        <Tooltip tip="seeAllComments" side="bottom" className="w-full">
          <button
            onClick={loadMore}
            className="w-full py-2 text-center text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            See all comments
          </button>
        </Tooltip>
      )}
    </div>
  )
}

export default CommentsSection
