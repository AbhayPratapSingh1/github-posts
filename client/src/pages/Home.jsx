import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { FaPlus, FaHeart, FaUsers, FaSearch, FaTimes, FaSortAmountDown, FaSortAmountUp, FaFire } from "react-icons/fa"
import { getPosts, searchPosts } from "../api/posts"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"
import Logo from "../components/Logo"
import PostCard from "../components/PostCard"

function Home() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [allPosts, setAllPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState("newest")

  useEffect(() => {
    getPosts(0, 500)
      .then((data) => setAllPosts(data.posts || []))
      .catch(() => addToast("Failed to load posts", "error"))
      .finally(() => setIsLoading(false))
  }, [addToast])

  const filteredPosts = useMemo(() => {
    let result = allPosts
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.shortDescription?.toLowerCase().includes(q)
      )
    }
    if (sort === "oldest") {
      result = [...result].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (sort === "most_liked") {
      result = [...result].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    } else {
      result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
    return result
  }, [allPosts, searchQuery, sort])

  const handleLikeChange = useCallback((post, state) => {
    setAllPosts((prev) =>
      prev.map((p) => p.id === post.id ? { ...p, ...state } : p)
    )
  }, [])

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

      <div className="relative mt-8">
        <FaSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search posts..."
          className="w-full rounded-lg border border-bg-300 bg-bg-100 py-2.5 pl-10 pr-10 text-sm text-fg-900 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900 dark:text-fg-100"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-400 hover:text-fg-600"
          >
            <FaTimes className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSort("newest")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            sort === "newest"
              ? "bg-primary-600 text-white"
              : "border border-bg-300 text-fg-600 hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600"
          }`}
        >
          <FaSortAmountDown className="size-3" />
          Newest
        </button>
        <button
          type="button"
          onClick={() => setSort("oldest")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            sort === "oldest"
              ? "bg-primary-600 text-white"
              : "border border-bg-300 text-fg-600 hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600"
          }`}
        >
          <FaSortAmountUp className="size-3" />
          Oldest
        </button>
        <button
          type="button"
          onClick={() => setSort("most_liked")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            sort === "most_liked"
              ? "bg-primary-600 text-white"
              : "border border-bg-300 text-fg-600 hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600"
          }`}
        >
          <FaFire className="size-3" />
          Most Liked
        </button>
      </div>

      {searchQuery && (
        <p className="mt-3 text-sm text-fg-500 dark:text-fg-400">
          {filteredPosts.length} result{filteredPosts.length !== 1 ? "s" : ""} for "{searchQuery}"
        </p>
      )}

      {isLoading && (
        <div className="mt-10 text-center">
          <p className="text-fg-500 dark:text-fg-400">Loading...</p>
        </div>
      )}

      <div className="mt-10 space-y-4">
        {filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} onLikeChange={handleLikeChange} />
        ))}
      </div>

      {!isLoading && filteredPosts.length === 0 && (
        <p className="mt-10 text-center text-sm text-fg-400">
          {searchQuery ? "No posts found" : "No posts yet"}
        </p>
      )}
    </main>
  </div>
}

export default Home
