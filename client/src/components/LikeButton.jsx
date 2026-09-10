import { useState } from "react"
import { FaHeart, FaRegHeart } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { likePost } from "../api/posts"

function LikeButton({ postId, liked, likeCount, onStateChange }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const { addToast } = useToast()

  const current = state || { liked: Boolean(liked), likeCount: likeCount || 0 }

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    if (!user) {
      addToast("Sign in to like posts", "info")
      return
    }

    const nextLiked = !current.liked
    const next = {
      liked: nextLiked,
      likeCount: Math.max(0, current.likeCount + (nextLiked ? 1 : -1)),
    }

    setState(next)
    setBusy(true)

    try {
      const res = await likePost(postId, nextLiked)
      const confirmed = { liked: res.liked, likeCount: res.like_count }
      setState(confirmed)
      if (onStateChange) onStateChange(confirmed)
      addToast(res.liked ? "Liked post" : "Removed like", "success")
    } catch (err) {
      setState(null)
      if (onStateChange) {
        onStateChange({ liked: Boolean(liked), likeCount: likeCount || 0 })
      }
      addToast(err.message || "Failed to update like", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={current.liked}
      aria-label={current.liked ? "Unlike post" : "Like post"}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        current.liked
          ? "border-red-300 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:border-red-800 dark:text-red-400"
          : "border-bg-300 text-fg-600 hover:border-red-400 hover:text-red-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-red-500 dark:hover:text-red-400"
      }`}
    >
      {current.liked ? <FaHeart /> : <FaRegHeart />}
      <span>{current.likeCount}</span>
    </button>
  )
}

export default LikeButton