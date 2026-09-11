import { useEffect, useState, useRef, useCallback } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FaGithub, FaPlay, FaGlobe, FaTrash, FaEdit } from "react-icons/fa"
import { READ_WORD_PER_MINUTE } from "../config/text"
import { POST_TYPE, findPostById } from "../config/posts"
import { getPostById, deletePost } from "../api/posts"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"
import Logo from "../components/Logo"
import ImageLightbox from "../components/ImageLightbox"
import CommentsSection from "../components/Comments"
import LikeButton from "../components/LikeButton"
import Tooltip from "../components/Tooltip"

const primaryAction = (post) => {
  if (!post) return null
  if (post.type === POST_TYPE.PLAYABLE && post.hosted?.url)
    return { label: "Play Now", icon: <FaPlay />, href: post.hosted.url }
  if (post.type === POST_TYPE.HOSTED && post.hosted?.url)
    return { label: "Visit Site", icon: <FaGlobe />, href: post.hosted.url }
  return null
}

function Post() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [post, setPost] = useState(() => findPostById(id))
  const [isLoading, setIsLoading] = useState(true)
  const [comments, setComments] = useState([])
  const [lightbox, setLightbox] = useState({ open: false, startIndex: 0, images: [] })
  const articleRef = useRef(null)

  useEffect(() => {
    setIsLoading(true)
    getPostById(id)
      .then((data) => {setPost(data); setComments(data.comments)})
      .catch(() => {
        setPost(findPostById(id))
        setComments(data.comments)
        addToast("Failed to load post", "error")
      })
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || isLoading) return
    fetchComments()
  }, [id, isLoading])

  useEffect(() => {
    if (!isLoading && window.location.hash === "#comments") {
      setTimeout(() => {
        document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }, [isLoading])

  const handleDelete = async () => {
    const confirm = window.confirm(`Are you sure you want to delete "${post?.title || id}"?`)
    if (!confirm) return
    try {
      await deletePost(id)
      navigate("/")
    } catch (err) {
      const msg = err.message || "Failed to delete post"
      addToast(msg, "error")
    }
  }

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}/comments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_token") || localStorage.getItem("admin_token")}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch {
      // Silently fail - comments are optional
    }
  }

  const timeToReadContent = (content) => {
    if (!content) return 0
    return Math.floor(content.split(" ").length / READ_WORD_PER_MINUTE)
  }

  const handleImageClick = useCallback((e) => {
    const img = e.target.closest("img")
    if (!img || !articleRef.current) return
    const allImages = Array.from(articleRef.current.querySelectorAll("img"))
    const index = allImages.indexOf(img)
    if (index === -1) return
    const sources = allImages.map((i) => i.src)
    setLightbox({ open: true, startIndex: index, images: sources })
  }, [])

  const handleLikeChange = (state) => {
    setPost((prev) => (prev ? { ...prev, ...state } : prev))
  }

  if (isLoading || !post) {
    return <div className="min-h-screen grid place-items-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <p className="text-fg-500 dark:text-fg-400">Loading...</p>
    </div>
  }

  const readTime = timeToReadContent(post.description)
  const action = primaryAction(post)
  const actionTip = post.type === POST_TYPE.PLAYABLE ? "playNow" : "visitSite"

  return <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
    <header className="sticky top-0 z-10 border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="text-sm font-bold tracking-wide uppercase">{post.title || "Untitled"}</span>
          </Link>
        <div className="flex items-center gap-2">
          {post.github && (
            <Tooltip tip="viewSource">
              <a
                href={post.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-bg-300 px-3 py-1.5 text-sm font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
              >
                <FaGithub />
                GitHub
              </a>
            </Tooltip>
          )}
          {action && (
            <Tooltip tip={actionTip}>
              <a
                href={action.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {action.icon}
                {action.label}
              </a>
            </Tooltip>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <ProfileMenu />
            </div>
          )}
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="py-14 sm:py-20">
        <p className="mb-3 text-xs font-semibold tracking-widest text-primary-600 uppercase dark:text-primary-400">
          {post.availableAt?.[0] || "N/A"}
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          {post.title || "Untitled"}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-fg-600 dark:text-fg-400">
          {post.shortDescription || "No description available."}
        </p>
        {post.githubOwner && (
          <p className="mt-2 text-sm text-fg-500 dark:text-fg-400">
            by{" "}
            <a
              href={`https://github.com/${post.githubOwner}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {post.authorName || post.authorUsername || post.githubOwner}
            </a>
          </p>
        )}
        {(readTime > 0 || post.hosted?.url) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-500 dark:text-fg-400">
            {readTime > 0 && <span>Read: {readTime} min</span>}
            {post.hosted?.url && (
              <>
                <span aria-hidden="true">•</span>
                <span>Hosted on {post.hosted.plateForm || "Unknown"}</span>
              </>
            )}
            {post.type === POST_TYPE.PLAYABLE && post.hosted?.url && (
              <>
                <span aria-hidden="true">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {action && (
            <Tooltip tip={actionTip}>
              <a
                href={action.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
              >
                {action.icon}
                {action.label}
              </a>
            </Tooltip>
          )}
          {post.github && (
            <Tooltip tip="viewSource">
              <a
                href={post.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-bg-300 px-6 py-3 text-base font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
              >
                <FaGithub />
                View Source
              </a>
            </Tooltip>
          )}
          <LikeButton
            postId={post.id}
            liked={post.liked}
            likeCount={post.likeCount}
            onStateChange={handleLikeChange}
          />
        </div>
      </section>

      <hr className="border-bg-200 dark:border-bg-800" />

      <article className="py-12" ref={articleRef} onClick={handleImageClick}>
        <div className="prose max-w-none dark:prose-invert">
          {post.description ? (
            /<[a-z][\s\S]*>/i.test(post.description) ? (
              <div dangerouslySetInnerHTML={{ __html: post.description }} />
            ) : (
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ node, ...props }) => (
                    <img {...props} className="rounded-lg cursor-pointer hover:opacity-85 transition-opacity" />
                  ),
                }}
              >
                {post.description}
              </Markdown>
            )
          ) : (
            <p className="text-fg-500 dark:text-fg-400">No description available.</p>
          )}
        </div>
      </article>

      <section className="border-t border-bg-200 py-12 dark:border-bg-800">
        <h2 className="mb-6 text-lg font-bold">Repository Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-700 dark:bg-bg-900">
            <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Language</p>
            <p className="mt-1 text-sm font-medium text-fg-900 dark:text-fg-100">{post.language || "N/A"}</p>
          </div>
          <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-700 dark:bg-bg-900">
            <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Owner</p>
            <p className="mt-1 text-sm font-medium text-fg-900 dark:text-fg-100">
              {post.githubOwner ? (
                <a
                  href={`https://github.com/${post.githubOwner}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline dark:text-primary-400"
                >
                  {post.authorName || post.authorUsername || post.githubOwner}
                </a>
              ) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-700 dark:bg-bg-900">
            <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Default Branch</p>
            <p className="mt-1 text-sm font-medium text-fg-900 dark:text-fg-100">{post.defaultBranch || "N/A"}</p>
          </div>
          <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-700 dark:bg-bg-900">
            <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Last Push</p>
            <p className="mt-1 text-sm font-medium text-fg-900 dark:text-fg-100">
              {post.lastPushAt ? new Date(post.lastPushAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 dark:border-bg-700 dark:bg-bg-900">
            <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Created On</p>
            <p className="mt-1 text-sm font-medium text-fg-900 dark:text-fg-100">
              {post.dateOfCreation ? new Date(post.dateOfCreation * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
            </p>
          </div>
        </div>
        {post.stats && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 text-center dark:border-bg-700 dark:bg-bg-900">
              <p className="text-2xl font-extrabold text-fg-900 dark:text-fg-100">{post.stats.stars ?? "N/A"}</p>
              <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Stars</p>
            </div>
            <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 text-center dark:border-bg-700 dark:bg-bg-900">
              <p className="text-2xl font-extrabold text-fg-900 dark:text-fg-100">{post.stats.forks ?? "N/A"}</p>
              <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Forks</p>
            </div>
            <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 text-center dark:border-bg-700 dark:bg-bg-900">
              <p className="text-2xl font-extrabold text-fg-900 dark:text-fg-100">{post.stats.watchers ?? "N/A"}</p>
              <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Watchers</p>
            </div>
            <div className="rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 text-center dark:border-bg-700 dark:bg-bg-900">
              <p className="text-2xl font-extrabold text-fg-900 dark:text-fg-100">{post.stats.openIssues ?? "N/A"}</p>
              <p className="text-xs font-semibold tracking-wider text-fg-500 uppercase dark:text-fg-400">Issues</p>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col items-center gap-4 border-t border-bg-200 py-16 text-center dark:border-bg-800">
        <h2 className="text-2xl font-bold">{post.title || "Untitled"}</h2>
        <p className="max-w-md text-fg-500 dark:text-fg-400">
          {post.shortDescription || "No description available."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {post.github && (
            <Tooltip tip="viewSource">
              <a
                href={post.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg bg-bg-900 px-6 py-3 text-base font-semibold text-bg-50 hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
              >
                <FaGithub />
                GitHub
              </a>
            </Tooltip>
          )}
          {action && (
            <Tooltip tip={actionTip}>
              <a
                href={action.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
              >
                {action.icon}
                {action.label}
              </a>
            </Tooltip>
          )}
          {user && user.id === post.user_id && (
            <div className="flex items-center gap-3">
              <Tooltip tip="editPost">
                <Link
                  to={`/post/${id}/edit`}
                  className="flex items-center gap-2.5 rounded-lg border border-primary-300 px-6 py-3 text-base font-medium text-primary-600 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-950"
                >
                  <FaEdit />
                  Edit
                </Link>
              </Tooltip>
              <Tooltip tip="deletePost">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2.5 rounded-lg border border-red-300 px-6 py-3 text-base font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <FaTrash />
                  Delete
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </section>
    </main>


    <section id="comments" className="border-t border-bg-200 bg-bg-50 py-8 dark:border-bg-800 dark:bg-bg-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-fg-900 dark:text-fg-100">
            Comments
          </h2>

          {comments?.length > 0 && (
            <p className="mt-1 text-sm text-fg-500 dark:text-fg-400">
              Join the discussion
            </p>
          )}
        </div>

        <CommentsSection
          postId={id}
          comments={comments || []}
          hasMoreComments={post.has_more_comments}
          setComments={setComments}
          isLoading={isLoading}
        />
      </div>
    </section>

    <footer className="border-t border-bg-200 dark:border-bg-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6 text-sm text-fg-500 sm:px-6 dark:text-fg-400">
        <p>© {new Date().getFullYear()} {post.title || "Untitled"}</p>
      </div>
    </footer>

    {lightbox.open && (
      <ImageLightbox
        images={lightbox.images}
        startIndex={lightbox.startIndex}
        onClose={() => setLightbox({ open: false, startIndex: 0, images: [] })}
      />
    )}
  </div>
}

export default Post
