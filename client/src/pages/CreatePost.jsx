import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaSpinner, FaCheck } from "react-icons/fa"
import ReactQuill from "react-quill-new"
import "react-quill-new/dist/quill.snow.css"
import { createPost, getGithubInfo } from "../api/posts"

const inputClass =
  "w-full rounded-lg border border-bg-300 bg-bg-50 px-4 py-2.5 text-sm text-fg-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900 dark:text-fg-100"

const labelClass = "block text-sm font-medium text-fg-700 dark:text-fg-300 mb-1.5"

function CreatePost() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    title: "",
    type: "playable",
    shortDescription: "",
    description: "",
    github: "",
    hostedUrl: "",
    hostedPlatform: "",
    availableAt: "web",
  })
  const [githubInfo, setGithubInfo] = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubStatus, setGithubStatus] = useState(null)
  const debounceRef = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!form.github) {
      setGithubInfo(null)
      setGithubStatus(null)
      return
    }

    setGithubStatus("loading")
    debounceRef.current = setTimeout(async () => {
      try {
        const info = await getGithubInfo(form.github)
        setGithubInfo(info)
        setGithubStatus("success")
      } catch {
        setGithubInfo(null)
        setGithubStatus("error")
      }
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [form.github])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const payload = {
      title: form.title,
      type: form.type,
      shortDescription: form.shortDescription,
      description: form.description,
      github: form.github || null,
      availableAt: form.availableAt ? form.availableAt.split(",").map((s) => s.trim()) : [],
      hosted: form.hostedUrl
        ? { url: form.hostedUrl, plateForm: form.hostedPlatform || "Unknown" }
        : null,
    }

    try {
      await createPost(payload)
      navigate("/")
    } catch (err) {
      setError(err.message || "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <header className="border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <FaArrowLeft className="text-xs" />
            <span className="inline-block size-2.5 rounded-full bg-primary-500" />
            <span className="text-sm font-bold tracking-wide uppercase">Post Panel</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Create New Post
        </h1>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Flappy Bird"
              className={inputClass}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Type *</label>
              <select value={form.type} onChange={set("type")} className={inputClass}>
                <option value="playable">Playable</option>
                <option value="hosted">Hosted</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Available At (comma-separated)</label>
              <input
                type="text"
                value={form.availableAt}
                onChange={set("availableAt")}
                placeholder="web, mobile"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Short Description *</label>
            <input
              type="text"
              required
              value={form.shortDescription}
              onChange={set("shortDescription")}
              placeholder="One-liner about the project"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>GitHub URL</label>
            <div className="relative">
              <input
                type="url"
                value={form.github}
                onChange={set("github")}
                placeholder="https://github.com/user/repo"
                className={inputClass}
              />
              {githubStatus === "loading" && (
                <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-fg-400" />
              )}
              {githubStatus === "success" && (
                <FaCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
              )}
            </div>
            {githubStatus === "error" && (
              <p className="mt-1 text-xs text-red-500">Could not fetch repo info</p>
            )}
            {githubInfo && (
              <div className="mt-2 rounded-lg border border-bg-200 bg-bg-100 px-4 py-3 text-sm dark:border-bg-700 dark:bg-bg-900">
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-fg-600 dark:text-fg-400">
                  <span><strong className="text-fg-900 dark:text-fg-100">Owner:</strong> {githubInfo.githubOwner}</span>
                  <span><strong className="text-fg-900 dark:text-fg-100">Language:</strong> {githubInfo.language}</span>
                  <span><strong className="text-fg-900 dark:text-fg-100">Branch:</strong> {githubInfo.defaultBranch}</span>
                  <span><strong className="text-fg-900 dark:text-fg-100">Stars:</strong> {githubInfo.stats?.stars}</span>
                  <span><strong className="text-fg-900 dark:text-fg-100">Forks:</strong> {githubInfo.stats?.forks}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Hosted URL</label>
              <input
                type="url"
                value={form.hostedUrl}
                onChange={set("hostedUrl")}
                placeholder="https://example.vercel.app"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Platform</label>
              <input
                type="text"
                value={form.hostedPlatform}
                onChange={set("hostedPlatform")}
                placeholder="e.g. Vercel"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description *</label>
            <div className="rounded-lg border border-bg-300 dark:border-bg-700 overflow-hidden">
              <ReactQuill
                theme="snow"
                value={form.description}
                onChange={(val) => setForm((f) => ({ ...f, description: val }))}
                placeholder="Write the full project description here..."
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["blockquote", "code-block"],
                    ["link", "image"],
                    ["clean"],
                  ],
                }}
                className="bg-bg-50 dark:bg-bg-900 text-fg-900 dark:text-fg-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              to="/"
              className="rounded-lg border border-bg-300 px-5 py-2.5 text-sm font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Post"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default CreatePost
