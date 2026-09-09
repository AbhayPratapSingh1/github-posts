import { useState, useEffect } from "react"
import { FaComment, FaTrash, FaReply } from "react-icons/fa"
import { API_BASE } from "../api/client"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"

function Comment({ content, userName, userAvatar, createdAt, onDelete }) {
  return (
    <div className="border-b border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-800 dark:bg-bg-900">
      <div className="flex items-start gap-3">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt=""
            className="size-6 rounded-full flex-s-0"
          />
        ) : (
          <span
            className="flex size-6 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white"
          >
            {userName?.charAt(0)?.toUpperCase() || "?"}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg-900 dark:text-fg-100 line-clamp-2">{content}</p>
          <p className="text-xs text-fg-500 dark:text-fg-400 mt-1">
            {new Date(createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Comment

function CommentsSection({ postId, comments, setComments, isLoading }) {
  const [input, setInput] = useState("")
  const { user } = useAuth()
  const { addToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    if (!user) {
      addToast("Log in to comment", "error")
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_token") || localStorage.getItem("admin_token")}`,
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
    // In a real app, we'd implement pagination here
    // For now, just show we can load more
  }

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      {user && (
        <form
          onSubmit={handleSubmit}
          className="bg-bg-100 dark:bg-bg-900 rounded-lg px-4 py-3 border border-bg-300"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a comment..."
              maxLength="200"
              className="flex-1 rounded-lg border border-bg-300 bg-bg-50 px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-bg-700 dark:bg-bg-800"
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
      )}

      {/* Comments List */}
      {isLoading && comments.length === 0 && (
        <p className="text-fg-500 dark:text-fg-400 text-center py-8">Loading comments...</p>
      )}

      {comments.length === 0 && !isLoading && (
        <p className="text-fg-500 dark:text-fg-400 text-center py-8">
          No comments yet. Be the first to comment!
        </p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <Comment
            key={comment.id}
            content={comment.content}
            userName={comment.user_id ? "User" : "Anonymous"}
            userAvatar={null}
            createdAt={comment.created_at}
          />
        ))}
      </div>

      {/* See all comments */}
      {!isLoading && comments.length > 0 && (
        <button
          onClick={loadMore}
          className="w-full text-left text-sm text-primary-600 hover:underline dark:text-primary-400 py-2"
        >
          See all {comments.length} comments
        </button>
      )}
    </div>
  )
}

export default CommentsSection