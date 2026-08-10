import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FaGithub, FaPlay, FaGlobe, FaArrowUp, FaArrowLeft } from "react-icons/fa"
import { READ_WORD_PER_MINUTE } from "../config/text"
import { POST_TYPE, findPostById } from "../config/posts"
import { getPostById } from "../api/posts"

const primaryAction = (post) => {
  if (post.type === POST_TYPE.PLAYABLE)
    return { label: "Play Now", icon: <FaPlay />, href: post.hosted.url }
  if (post.type === POST_TYPE.HOSTED)
    return { label: "Visit Site", icon: <FaGlobe />, href: post.hosted.url }
  return null
}

function Post() {
  const { id } = useParams()
  const [post, setPost] = useState(() => findPostById(id))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getPostById(id)
      .then((data) => setPost(data))
      .catch(() => setPost(findPostById(id)))
      .finally(() => setIsLoading(false))
  }, [id])

  const timeToReadContent = (content) => {
    return Math.floor(content?.split(" ").length / READ_WORD_PER_MINUTE);
  }

  if (isLoading || !post) {
    return <div className="min-h-screen grid place-items-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <p className="text-fg-500 dark:text-fg-400">Loading...</p>
    </div>
  }

  const readTime = timeToReadContent(post.description)
  const action = primaryAction(post)

  return <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
    <header className="sticky top-0 z-10 border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <FaArrowLeft className="text-xs" />
          <span className="inline-block size-2.5 rounded-full bg-primary-500" />
          <span className="text-sm font-bold tracking-wide uppercase">{post.title}</span>
        </Link>
        <div className="flex items-center gap-2">
          {post.github && (
            <a
              href={post.github}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md border border-bg-300 px-3 py-1.5 text-sm font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
            >
              <FaGithub />
              GitHub
            </a>
          )}
          {action && (
            <a
              href={action.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {action.icon}
              {action.label}
            </a>
          )}
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="py-14 sm:py-20">
        <p className="mb-3 text-xs font-semibold tracking-widest text-primary-600 uppercase dark:text-primary-400">
          {post.availableAt?.[0]} Game
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-fg-600 dark:text-fg-400">
          {post.shortDescription}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-500 dark:text-fg-400">
          <span>Read: {readTime} min</span>
          {post.hosted?.url && (
            <>
              <span aria-hidden="true">•</span>
              <span>Hosted on {post.hosted.plateForm}</span>
            </>
          )}
          {post.type === POST_TYPE.PLAYABLE && (
            <>
              <span aria-hidden="true">•</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </>
          )}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {action && (
            <a
              href={action.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
            >
              {action.icon}
              {action.label}
            </a>
          )}
          {post.github && (
            <a
              href={post.github}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-bg-300 px-6 py-3 text-base font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
            >
              <FaGithub />
              View Source
            </a>
          )}
        </div>
      </section>

      <hr className="border-bg-200 dark:border-bg-800" />

      <article className="py-12">
        <div className="prose max-w-none dark:prose-invert">
          <Markdown remarkPlugins={[remarkGfm]}>
            {post.description}
          </Markdown>
        </div>
      </article>

      <section className="flex flex-col items-center gap-4 border-t border-bg-200 py-16 text-center dark:border-bg-800">
        <h2 className="text-2xl font-bold">{post.title}</h2>
        <p className="max-w-md text-fg-500 dark:text-fg-400">
          {post.shortDescription}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {post.github && (
            <a
              href={post.github}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-lg bg-bg-900 px-6 py-3 text-base font-semibold text-bg-50 hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
            >
              <FaGithub />
              GitHub
            </a>
          )}
          {action && (
            <a
              href={action.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
            >
              {action.icon}
              {action.label}
            </a>
          )}
        </div>
      </section>
    </main>

    <footer className="border-t border-bg-200 dark:border-bg-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6 text-sm text-fg-500 sm:px-6 dark:text-fg-400">
        <p>© {new Date().getFullYear()} {post.title}</p>
        <a href="#" className="flex items-center gap-1.5 hover:text-fg-900 dark:hover:text-fg-100">
          Back to top
          <FaArrowUp />
        </a>
      </div>
    </footer>
  </div>
}

export default Post