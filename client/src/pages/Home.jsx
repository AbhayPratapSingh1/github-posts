import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FaPlay, FaPlus, FaGithub } from "react-icons/fa"
import { getPosts } from "../api/posts"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"

const primaryLabel = (type) => {
  if (type === "playable") return <><FaPlay /> Playable</>
  if (type === "hosted") return "Hosted"
  return null
}

function Home() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch(() => {
        setPosts([])
        addToast("Failed to load posts", "error")
      })
      .finally(() => setIsLoading(false))
  }, [])

  return <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
    <header className="border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-primary-500" />
          <span className="text-sm font-bold tracking-wide uppercase">Post Panel</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
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

      {isLoading && <p className="mt-10 text-fg-500 dark:text-fg-400">Loading...</p>}

      <div className="mt-10 space-y-4">
        {posts.map((post) => {
          const label = primaryLabel(post.type)
          return (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="group flex flex-col gap-3 rounded-xl border border-bg-200 bg-bg-100 p-5 transition-colors hover:border-primary-400 dark:border-bg-800 dark:bg-bg-900 dark:hover:border-primary-600 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {post.title}
                  </h2>
                  {label && (
                    <span className="flex items-center gap-1.5 rounded-full bg-primary-600/10 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:text-primary-400">
                      {label}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-fg-600 dark:text-fg-400">
                  {post.shortDescription}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4 text-sm text-fg-500 dark:text-fg-400">
                {post.hosted?.url && (
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <FaPlay className="text-xs" />
                    {post.hosted.plateForm}
                  </span>
                )}
                {post.github && <FaGithub className="text-base" />}
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  </div>
}

export default Home
