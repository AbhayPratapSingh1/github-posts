import { useEffect, useState, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { FaPlus, FaHeart, FaSpinner } from "react-icons/fa"
import { getPosts } from "../api/posts"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"
import Logo from "../components/Logo"
import PostCard from "../components/PostCard"

const PAGE_SIZE = 12

function Home() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)
  const sentinelRef = useRef(null)

  const loadPosts = useCallback(async (offset, append = false) => {
    try {
      const data = await getPosts(offset, PAGE_SIZE)
      const newPosts = data.posts || []
      setPosts((prev) => append ? [...prev, ...newPosts] : newPosts)
      setHasMore(offset + PAGE_SIZE < data.total)
      offsetRef.current = offset + PAGE_SIZE
    } catch {
      addToast("Failed to load posts", "error")
    }
  }, [addToast])

  const handleLikeChange = (post, state) => {
    setPosts((prev) =>
      prev.map((p) => p.id === post.id ? { ...p, ...state } : p)
    )
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setIsWakingUp(true)
    }, 3000)

    loadPosts(0).finally(() => {
      setIsLoading(false)
      setIsWakingUp(false)
      clearTimeout(timer)
    })
  }, [loadPosts])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isLoading) {
          setLoadingMore(true)
          loadPosts(offsetRef.current, true).finally(() => setLoadingMore(false))
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, isLoading, loadPosts])

  return <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
    <header className="border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="text-sm font-bold tracking-wide uppercase">Post Panel</span>
          </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/liked"
                className="flex items-center gap-1.5 rounded-lg border border-bg-300 px-3 py-1.5 text-sm font-medium text-fg-600 transition-colors hover:border-red-400 hover:text-red-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-red-500 dark:hover:text-red-400"
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
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-lg bg-bg-900 px-4 py-1.5 text-sm font-semibold text-bg-50 hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="mb-3 text-xs font-semibold tracking-widest text-primary-600 uppercase dark:text-primary-400">
        Projects
      </p>
      <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
        Showcase
      </h1>
      <p className="mt-4 max-w-xl text-lg text-fg-600 dark:text-fg-400">
        A collection of games and tools built for the web.
      </p>

      {isLoading && (
        <div className="mt-10 text-center">
          <p className="text-fg-500 dark:text-fg-400">Loading...</p>
          {isWakingUp && (
            <p className="mt-2 text-sm text-fg-400 dark:text-fg-500">
              Server is waking up, this may take a moment...
            </p>
          )}
        </div>
      )}

      <div className="mt-10 space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLikeChange={handleLikeChange} />
        ))}
      </div>

      <div ref={sentinelRef} className="py-4">
        {loadingMore && (
          <div className="flex items-center justify-center gap-2 text-fg-400">
            <FaSpinner className="animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-sm text-fg-400">You've reached the end</p>
        )}
      </div>
    </main>
  </div>
}

export default Home
