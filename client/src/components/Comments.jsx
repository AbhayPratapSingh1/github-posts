import { useState, useEffect } from "react"
import { FaComment, FaTrash, FaReply } from "react-icons/fa"
import { API_BASE } from "../api/client"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { getPostCommentById } from "../api/posts"
import { Link, useLocation } from "react-router-dom"

function Comment({
  content,
  username,
  name,
  github_id,
  avatar_url,
  created_at,
}) {
  const displayName = name || username || "User"
  const githubUsername = username || github_id

  const githubUrl = githubUsername
    ? `https://github.com/${githubUsername}`
    : null

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
          <p className="text-sm leading-relaxed text-fg-800 dark:text-fg-200">
            {content}
          </p>

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
          </div>
        </div>
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
            to="/login"
            state={{ from: location }}
            className="shrink-0 rounded-lg bg-bg-900 px-4 py-2 text-sm font-semibold text-bg-50 hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
          >
            Sign in
          </Link>

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
              content={comment.content}
              username={comment.username}
              name={comment.name}
              github_id={comment.github_id}
              avatar_url={comment.avatar_url}
              created_at={comment.created_at}
            />
          ))}
        </div>
      )}

      {/* See all comments */}
      {!isLoading && postHasMoreComments && (
        <button
          onClick={loadMore}
          className="w-full py-2 text-center text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          See all comments
        </button>
      )}
    </div>
  )
}

export default CommentsSection
