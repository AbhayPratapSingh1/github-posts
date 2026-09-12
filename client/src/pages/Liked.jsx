import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FaHeart, FaPlus, FaSpinner, FaArrowLeft } from "react-icons/fa"
import { getLikedPosts } from "../api/posts"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"
import Logo from "../components/Logo"
import PostCard from "../components/PostCard"

function Liked() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [likedPosts, setLikedPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getLikedPosts()
      .then((data) => {
        if (!cancelled) setLikedPosts(data.posts || [])
      })
      .catch(() => {
        if (!cancelled) addToast("Failed to load liked posts", "error")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [addToast])

  const handleLikeChange = (post, state) => {
    setLikedPosts((prev) => {
      if (state.liked) {
        return prev.map((p) => p.id === post.id ? { ...p, ...state } : p)
      }
      return prev.filter((p) => p.id !== post.id)
    })
  }

  return <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
    <header className="border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="size-7" />
          <span className="text-sm font-bold tracking-wide uppercase">Post Panel</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <Link
                to="/liked"
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-600 dark:text-red-400"
                aria-current="page"
              >
                <FaHeart />
                Liked
              </Link>
              <Link
                to="/create"
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
              >
                <FaPlus className="text-xs" />
                New Post
              </Link>
              <ProfileMenu />
            </>
          )}
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 rounded-lg border border-bg-300 px-3 py-1.5 text-sm font-medium text-fg-600 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600 dark:hover:text-primary-400"
      >
        <FaArrowLeft className="text-xs" />
        Back to all posts
      </Link>

      <p className="mb-3 text-xs font-semibold tracking-widest text-primary-600 uppercase dark:text-primary-400">
        Liked
      </p>
      <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
        Your Likes
      </h1>
      <p className="mt-4 max-w-xl text-lg text-fg-600 dark:text-fg-400">
        Posts you loved, newest like first.
      </p>

      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-fg-400">
          <FaSpinner className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      )}

      {!isLoading && likedPosts.length === 0 && (
        <div className="mt-10 text-center">
          <FaHeart className="mx-auto text-4xl text-fg-300 dark:text-fg-700" />
          <p className="mt-3 text-fg-500 dark:text-fg-400">
            No liked posts yet — tap the heart on any post.
          </p>
        </div>
      )}

      {!isLoading && likedPosts.length > 0 && (
        <div className="mt-10 space-y-4">
          {likedPosts.map((post) => (
            <PostCard key={post.id} post={post} onLikeChange={handleLikeChange} />
          ))}
        </div>
      )}
    </main>
  </div>
}

export default Liked