import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { FaArrowLeft, FaGithub } from "react-icons/fa"
import { getUserPosts } from "../api/posts"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"
import Logo from "../components/Logo"
import PostCard from "../components/PostCard"

function UserProfile() {
  const { username } = useParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [posts, setPosts] = useState([])
  const [profileUser, setProfileUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getUserPosts(username)
      .then((data) => {
        setPosts(data.posts || [])
        setProfileUser(data.user)
      })
      .catch(() => addToast("Failed to load user posts", "error"))
      .finally(() => setIsLoading(false))
  }, [username, addToast])

  const handleLikeChange = (post, state) => {
    setPosts((prev) =>
      prev.map((p) => p.id === post.id ? { ...p, ...state } : p)
    )
  }

  return (
    <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <header className="border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="hidden text-sm font-bold tracking-wide uppercase sm:inline">Post Panel</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {user && <ProfileMenu />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/users"
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-bg-300 px-3 py-1.5 text-sm font-medium text-fg-600 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600 dark:hover:text-primary-400"
        >
          <FaArrowLeft className="text-xs" />
          Back to users
        </Link>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-fg-500 dark:text-fg-400">Loading...</p>
        ) : profileUser ? (
          <>
            <div className="flex items-center gap-4 py-6">
              {profileUser.avatar_url ? (
                <img
                  src={profileUser.avatar_url}
                  alt={profileUser.username}
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
                  {(profileUser.name || profileUser.username || "U").charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <h1 className="text-2xl font-bold">{profileUser.name || profileUser.username}</h1>
                <div className="flex items-center gap-3 text-sm text-fg-500 dark:text-fg-400">
                  {profileUser.username && <span>@{profileUser.username}</span>}
                  {profileUser.github_id && (
                    <a
                      href={`https://github.com/${profileUser.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      <FaGithub className="size-4" />
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>

            <p className="mb-4 text-sm text-fg-500 dark:text-fg-400">
              {posts.length} post{posts.length !== 1 ? "s" : ""}
            </p>

            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onLikeChange={handleLikeChange} />
              ))}
            </div>

            {posts.length === 0 && (
              <p className="py-10 text-center text-sm text-fg-400">No posts yet</p>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-sm text-fg-400">User not found</p>
        )}
      </main>
    </div>
  )
}

export default UserProfile
