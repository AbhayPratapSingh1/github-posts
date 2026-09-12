import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FaUsers, FaPlus, FaSpinner, FaArrowLeft } from "react-icons/fa"
import { getUsers } from "../api/users"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"
import Logo from "../components/Logo"

function Users() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getUsers()
      .then((data) => {
        if (!cancelled) setUsers(data.users || [])
      })
      .catch(() => {
        if (!cancelled) addToast("Failed to load users", "error")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [addToast])

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
                className="flex items-center gap-1.5 rounded-lg bg-primary-600/10 px-2.5 py-1.5 text-sm font-semibold text-primary-700 dark:text-primary-400 sm:px-3"
                aria-current="page"
              >
                <FaUsers />
                <span className="hidden sm:inline">Users</span>
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
            <>
              <Link
                to="/users"
                className="flex items-center gap-1.5 rounded-lg bg-primary-600/10 px-2.5 py-1.5 text-sm font-semibold text-primary-700 dark:text-primary-400 sm:px-3"
                aria-current="page"
              >
                <FaUsers />
                <span className="hidden sm:inline">Users</span>
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-lg bg-bg-900 px-2.5 py-1.5 text-sm font-semibold text-bg-50 hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200 sm:gap-2 sm:px-4"
              >
                Sign in
              </Link>
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
        Community
      </p>
      <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
        Users
      </h1>
      <p className="mt-4 max-w-xl text-lg text-fg-600 dark:text-fg-400">
        Everyone building on Post Panel.
      </p>

      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-fg-400">
          <FaSpinner className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <div className="mt-10 text-center">
          <FaUsers className="mx-auto text-4xl text-fg-300 dark:text-fg-700" />
          <p className="mt-3 text-fg-500 dark:text-fg-400">No users yet.</p>
        </div>
      )}

      {!isLoading && users.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex gap-4 rounded-xl border border-bg-200 bg-bg-100 p-5 transition-colors hover:border-primary-400 dark:border-bg-800 dark:bg-bg-900 dark:hover:border-primary-600"
            >
              <img
                src={u.avatar_url || `https://github.com/${u.username}.png`}
                alt={u.username}
                className="size-14 shrink-0 rounded-full"
                onClick={() => window.open(`https://github.com/${u.username}`, "_blank")}
                style={{ cursor: "pointer" }}
              />
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-fg-900 dark:text-fg-100">
                  {u.name || u.username}
                </h2>
                <a
                  href={`https://github.com/${u.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  @{u.username}
                </a>
                <p className="mt-1 line-clamp-2 text-sm text-fg-600 dark:text-fg-400">
                  {u.bio || "No bio yet."}
                </p>
                <p className="mt-2 flex items-center gap-3 text-xs text-fg-500 dark:text-fg-400">
                  <span>{u.postCount} {u.postCount === 1 ? "post" : "posts"}</span>
                  {u.created_at && (
                    <span>Joined {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  </div>
}

export default Users