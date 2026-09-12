import { useState, useRef, useCallback } from "react"
import { FaHeart, FaRegHeart } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { likePost } from "../api/posts"

function LikeButton({ postId, liked, likeCount, onStateChange }) {
  const [state, setState] = useState(null)
  const { user } = useAuth()
  const { addToast } = useToast()
  const requestIdRef = useRef(0)

  const current = state || { liked: Boolean(liked), likeCount: likeCount || 0 }

  const handleClick = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()

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
    if (onStateChange) onStateChange(next)

    const reqId = ++requestIdRef.current

    try {
      const res = await likePost(postId, nextLiked)
      if (reqId !== requestIdRef.current) return
      const confirmed = { liked: res.liked, likeCount: res.like_count }
      setState(confirmed)
      if (onStateChange) onStateChange(confirmed)
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      setState(null)
      if (onStateChange) {
        onStateChange({ liked: Boolean(liked), likeCount: likeCount || 0 })
      }
      addToast(err.message || "Failed to update like", "error")
    }
  }, [current.liked, current.likeCount, liked, likeCount, postId, user, addToast, onStateChange])

  if (!user) {
    return (
      <span
        className="flex items-center gap-1.5 rounded-full border border-bg-300 px-3 py-1.5 text-sm font-medium text-fg-400 dark:border-bg-700 dark:text-fg-500 cursor-not-allowed opacity-60"
        title="Sign in to like"
      >
        <FaRegHeart />
        <span>{current.likeCount}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
