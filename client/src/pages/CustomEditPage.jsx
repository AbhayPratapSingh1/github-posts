import { useState } from "react"
import { Link } from "react-router-dom"
import { FaArrowLeft, FaSpinner, FaCheck } from "react-icons/fa"
import { getGithubInfo, generatePostContent } from "../api/posts"
import { useToast } from "../context/ToastContext"
import Logo from "../components/Logo"
import Tooltip from "../components/Tooltip"
import BlockEditor from "../components/BlockEditor"

const inputClass =
  "rounded-lg border border-bg-300 bg-bg-50 px-3 py-2 text-sm text-fg-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900 dark:text-fg-100"

function CustomEditPage() {
  const { addToast } = useToast()
  const [url, setUrl] = useState("")
  const [info, setInfo] = useState(null)
  const [infoStatus, setInfoStatus] = useState("idle")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [post, setPost] = useState(null)
  const [description, setDescription] = useState("")

  const handleFetchInfo = async () => {
    if (!url.trim()) return
    setInfoStatus("loading")
    setInfo(null)
    try {
      const data = await getGithubInfo(url.trim())
      setInfo(data)
      setInfoStatus("success")
    } catch (err) {
      setInfoStatus("error")
      addToast(err.message || "Could not fetch repo info", "error")
    }
  }

  const handleGenerate = async () => {
    if (!url.trim()) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const data = await generatePostContent(url.trim())
      setPost({
        title: data.title || "",
        shortDescription: data.shortDescription || "",
        type: data.type || "none",
        availableAt: data.availableAt || [],
        github: url.trim(),
      })
      setDescription(data.description || "")
    } catch (err) {
      const msg = err.message || "Failed to generate content"
      setGenerateError(msg)
      addToast(msg, "error")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <header className="border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Tooltip tip="back" side="right">
              <FaArrowLeft className="text-xs" />
            </Tooltip>
            <Logo className="size-7" />
            <span className="text-sm font-bold tracking-wide uppercase">Post Panel</span>
          </Link>
          <span className="rounded-full bg-primary-600/10 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-400">
            Edit Lab
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!post ? (
          <section className="mx-auto max-w-xl">
            <p className="mb-3 text-xs font-semibold tracking-widest text-primary-600 uppercase dark:text-primary-400">
              Custom Editor
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Generate & edit a post block by block
            </h1>
            <p className="mt-3 text-fg-600 dark:text-fg-400">
              Paste a GitHub repo URL. We fetch it and run it through Gemini — then every heading,
              paragraph, and list item becomes its own editable block, laid out like the real post page.
            </p>

            <div className="mt-8 space-y-3">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setInfo(null)
                  setInfoStatus("idle")
                }}
                onKeyDown={(e) => e.key === "Enter" && handleFetchInfo()}
                placeholder="https://github.com/user/repo"
                className={`${inputClass} w-full`}
              />

              <div className="flex items-center gap-3">
                <Tooltip tip="fetchInfo">
                  <button
                    type="button"
                    onClick={handleFetchInfo}
                    disabled={infoStatus === "loading"}
                    className="flex items-center gap-2 rounded-lg border border-bg-300 px-4 py-2 text-sm font-medium hover:bg-bg-100 disabled:opacity-50 dark:border-bg-700 dark:hover:bg-bg-900"
                  >
                    {infoStatus === "loading" ? <FaSpinner className="animate-spin" /> : "Fetch Info"}
                  </button>
                </Tooltip>
                <Tooltip tip="generateAI">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || !info}
                    className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {generating ? <FaSpinner className="animate-spin" /> : "Generate with AI"}
                  </button>
                </Tooltip>
              </div>

              {infoStatus === "success" && info && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-900/20">
                  <div className="flex items-center gap-2 font-medium">
                    <FaCheck className="text-emerald-500" />
                    {info.githubOwner}/{url.split("/").pop() || ""}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-500 dark:text-fg-400">
                    <span>Language: {info.language || "N/A"}</span>
                    <span>Branch: {info.defaultBranch || "N/A"}</span>
                    <span>Stars: {info.stats?.stars || 0}</span>
                    <span>Forks: {info.stats?.forks || 0}</span>
                  </div>
                </div>
              )}

              {infoStatus === "error" && (
                <p className="text-sm text-red-500">Could not fetch repo info — check the URL.</p>
              )}

              {generateError && (
                <p className="text-sm text-red-500">{generateError}</p>
              )}
            </div>
          </section>
        ) : (
          <article>
            <button
              type="button"
              onClick={() => {
                setPost(null)
                setDescription("")
              }}
              className="mb-6 flex items-center gap-2 rounded-lg border border-bg-300 px-3 py-1.5 text-sm font-medium text-fg-600 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600 dark:hover:text-primary-400"
            >
              <FaArrowLeft className="text-xs" />
              New URL
            </button>

            <p className="mb-3 text-xs font-semibold tracking-widest text-primary-600 uppercase dark:text-primary-400">
              {post.availableAt?.[0] || "N/A"}
            </p>

            <h2 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
              {post.title}
            </h2>

            <p className="mt-4 max-w-xl text-lg text-fg-600 dark:text-fg-400">
              {post.shortDescription}
            </p>

            <hr className="my-8 border-bg-200 dark:border-bg-800" />

            <BlockEditor value={description} onChange={setDescription} />
          </article>
        )}
      </main>
    </div>
  )
}

export default CustomEditPage
