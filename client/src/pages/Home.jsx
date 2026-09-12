import { useEffect, useState, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { FaPlus, FaHeart, FaUsers, FaSpinner, FaSearch, FaTimes } from "react-icons/fa"
import { getPosts, searchPosts } from "../api/posts"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const offsetRef = useRef(0)
  const sentinelRef = useRef(null)
  const debounceRef = useRef(null)
  const searchOffsetRef = useRef(0)

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

  const loadSearchResults = useCallback(async (query, offset, append = false) => {
    try {
      const data = await searchPosts(query, offset, PAGE_SIZE)
      const newPosts = data.posts || []
      setPosts((prev) => append ? [...prev, ...newPosts] : newPosts)
      setHasMore(offset + PAGE_SIZE < data.total)
      searchOffsetRef.current = offset + PAGE_SIZE
    } catch {
      addToast("Search failed", "error")
    }
  }, [addToast])

  const handleLikeChange = (post, state) => {
    setPosts((prev) =>
      prev.map((p) => p.id === post.id ? { ...p, ...state } : p)
    )
  }

  const handleSearch = useCallback((value) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setIsSearching(false)
      setPosts([])
      setHasMore(true)
      loadPosts(0)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      setLoadingMore(false)
      searchOffsetRef.current = 0
      try {
        const data = await searchPosts(value.trim(), 0, PAGE_SIZE)
        setPosts(data.posts || [])
        setHasMore(PAGE_SIZE < data.total)
        searchOffsetRef.current = PAGE_SIZE
      } catch {
        addToast("Search failed", "error")
      }
    }, 300)
  }, [addToast, loadPosts])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

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
          const work = isSearching
            ? loadSearchResults(searchQuery, searchOffsetRef.current, true)
            : loadPosts(offsetRef.current, true)
          work.finally(() => setLoadingMore(false))
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, isLoading, loadPosts, loadSearchResults, isSearching, searchQuery])

  return <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
    <header className="border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="hidden text-sm font-bold tracking-wide uppercase sm:inline">Post Panel</span>
          </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          {user ? (
            <>
              <Link
                to="/users"
                className="flex items-center gap-1.5 rounded-lg border border-bg-300 px-2.5 py-1.5 text-sm font-medium text-fg-600 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600 dark:hover:text-primary-400 sm:px-3"
              >
                <FaUsers />
                <span className="hidden sm:inline">Users</span>
              </Link>
              <Link
                to="/liked"
                className="flex items-center gap-1.5 rounded-lg border border-bg-300 px-2.5 py-1.5 text-sm font-medium text-fg-600 transition-colors hover:border-red-400 hover:text-red-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-red-500 dark:hover:text-red-400 sm:px-3"
              >
                <FaHeart />
                <span className="hidden sm:inline">Liked</span>
              </Link>
              <Link
                to="/create"
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 sm:px-3"
              >
                <FaPlus className="text-xs" />
                <span className="hidden sm:inline">New Post</span>
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

      <div className="relative z-0 mt-8">
        <FaSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search posts..."
          className="w-full rounded-lg border border-bg-300 bg-bg-100 py-2.5 pl-10 pr-10 text-sm text-fg-900 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900 dark:text-fg-100"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-400 hover:text-fg-600"
          >
            <FaTimes className="size-4" />
          </button>
        )}
      </div>

      {isSearching && (
        <p className="mt-3 text-sm text-fg-500 dark:text-fg-400">
          {posts.length} result{posts.length !== 1 ? "s" : ""} for "{searchQuery}"
        </p>
      )}

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
        {loadingMore && !isSearching && (
          <div className="flex items-center justify-center gap-2 text-fg-400">
            <FaSpinner className="animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && !isSearching && (
          <p className="text-center text-sm text-fg-400">You've reached the end</p>
        )}
        {!isLoading && posts.length === 0 && isSearching && (
          <p className="text-center text-sm text-fg-400">No posts found</p>
        )}
      </div>
    </main>
  </div>
}

export default Home
