import { useState, useEffect, useRef } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { FaArrowLeft, FaSpinner, FaCheck, FaRobot, FaPencilAlt } from "react-icons/fa"
import { createPost, updatePost, adminUpdatePost, getGithubInfo, getPostById, generatePostContent } from "../api/posts"
import { useToast } from "../context/ToastContext"
import { useAuth } from "../context/AuthContext"
import Logo from "../components/Logo"
import Tooltip from "../components/Tooltip"
import BlockEditor from "../components/BlockEditor"
import { uploadMediaBatch, finalizePostMedia } from "../api/media"

const inputClass =
  "w-full rounded-lg border border-bg-300 bg-bg-50 px-4 py-2.5 text-sm text-fg-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900 dark:text-fg-100"

const labelClass = "block text-sm font-medium text-fg-700 dark:text-fg-300 mb-1.5"

function CreatePost() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const isAdmin = window.location.pathname.startsWith("/admin/post/")
  const { addToast } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [loadingPost, setLoadingPost] = useState(isEdit)
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
  const [githubStatus, setGithubStatus] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [creationMethod, setCreationMethod] = useState(null) // null | "ai" | "custom"
  const debounceRef = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    if (!id) return
    getPostById(id)
      .then((post) => {
        setForm({
          title: post.title || "",
          type: post.type || "playable",
          shortDescription: post.shortDescription || "",
          description: post.description || "",
          github: post.github || "",
          hostedUrl: post.hosted?.url || "",
          hostedPlatform: post.hosted?.plateForm || "",
          availableAt: Array.isArray(post.availableAt) ? post.availableAt.join(", ") : "web",
        })
        if (post.github) {
          setGithubInfo({
            githubOwner: post.githubOwner,
            language: post.language,
            defaultBranch: post.defaultBranch,
            stats: post.stats,
          })
          setCreationMethod("custom")
        }
      })
      .catch(() => {
        setError("Failed to load post")
        addToast("Failed to load post", "error")
      })
      .finally(() => setLoadingPost(false))
  }, [id])

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
        if (!isAdmin && info.ownerId && user?.github_id && info.ownerId !== user.github_id) {
          setGithubStatus("not-owner")
        } else {
          setGithubStatus("success")
        }
      } catch {
        setGithubInfo(null)
        setGithubStatus("error")
      }
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [form.github, user])

  const handleGenerate = async () => {
    if (!form.github) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const data = await generatePostContent(form.github)
      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        shortDescription: data.shortDescription || f.shortDescription,
        description: data.description || f.description,
        type: data.type || f.type,
        availableAt: Array.isArray(data.availableAt)
          ? data.availableAt.join(", ")
          : f.availableAt,
      }))
      setCreationMethod("ai")
    } catch (err) {
      const msg = err.message || "Failed to generate content"
      setGenerateError(msg)
      addToast(msg, "error")
    } finally {
      setGenerating(false)
    }
  }

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
      let postId = id
      if (isEdit) {
        if (isAdmin) {
          await adminUpdatePost(id, payload)
        } else {
          await updatePost(id, payload)
        }
      } else {
        const result = await createPost(payload)
        postId = result.id
      }

      // Collect media from editor blocks
      const mediaItems = []
      if (window.__blockEditorBlocks) {
        for (const block of window.__blockEditorBlocks) {
          if (block.mediaId && block.file) {
            mediaItems.push({
              clientMediaId: block.mediaId,
              type: block.mediaType || 'image',
              file: block.file,
            })
          }
          if (block.type === 'gallery' && block.images) {
            for (const img of block.images) {
              if (img.mediaId && img.file) {
                mediaItems.push({
                  clientMediaId: img.mediaId,
                  type: 'image',
                  file: img.file,
                })
              }
            }
          }
        }
      }

      if (mediaItems.length > 0 && postId) {
        await uploadMediaBatch(postId, mediaItems)
        await finalizePostMedia(postId)
      }

      navigate(isAdmin ? "/admin/dashboard" : "/")
    } catch (err) {
      const msg = err.message || "Failed to save post"
      setError(msg)
      addToast(msg, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const showForm = isEdit || creationMethod !== null

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
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {isEdit ? "Edit Post" : "Create New Post"}
        </h1>

        {loadingPost && (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin mr-3 size-5 text-primary-600" />
            <span className="text-fg-500 dark:text-fg-400">Loading post...</span>
          </div>
        )}

        {!loadingPost && error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {!loadingPost && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: GitHub URL (always shown for new posts, hidden in edit mode if already set) */}
            {(!isEdit || !form.github) && (
              <div>
                <label className={labelClass}>GitHub Repository URL *</label>
                <div className="relative">
                  <input
                    type="url"
                    required={!isEdit}
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
                {githubStatus === "not-owner" && (
                  <p className="mt-1 text-xs text-red-500">You are not the owner of this repository</p>
                )}
                {githubInfo && githubStatus !== "not-owner" && (
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
            )}

            {/* Step 2: Choose creation method (only for new posts with valid GitHub URL) */}
            {!isEdit && githubStatus === "success" && !creationMethod && (
              <div className="rounded-lg border-2 border-dashed border-bg-300 bg-bg-100 p-6 dark:border-bg-700 dark:bg-bg-900">
                <p className="mb-4 text-center text-sm font-medium text-fg-700 dark:text-fg-300">
                  How would you like to create your post?
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Tooltip tip="generateAI">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex flex-col items-center gap-3 rounded-lg border-2 border-primary-300 bg-primary-50 p-6 text-primary-700 transition-all hover:border-primary-500 hover:bg-primary-100 disabled:opacity-50 dark:border-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:hover:border-primary-500 dark:hover:bg-primary-900"
                    >
                      {generating ? (
                        <FaSpinner className="animate-spin size-8" />
                      ) : (
                        <FaRobot className="size-8" />
                      )}
                      <span className="font-semibold">
                        {generating ? "Generating..." : "Generate with AI"}
                      </span>
                      <span className="text-xs text-primary-600 dark:text-primary-400">
                        Auto-fill from repo data
                      </span>
                    </button>
                  </Tooltip>
                  <Tooltip tip="customPost">
                    <button
                      type="button"
                      onClick={() => setCreationMethod("custom")}
                      className="flex flex-col items-center gap-3 rounded-lg border-2 border-bg-300 bg-bg-50 p-6 text-fg-700 transition-all hover:border-primary-500 hover:bg-bg-100 dark:border-bg-700 dark:bg-bg-950 dark:text-fg-300 dark:hover:border-primary-500 dark:hover:bg-bg-900"
                    >
                      <FaPencilAlt className="size-8" />
                      <span className="font-semibold">Custom</span>
                      <span className="text-xs text-fg-500 dark:text-fg-400">
                        Write your own content
                      </span>
                    </button>
                  </Tooltip>
                </div>
                {generateError && (
                  <p className="mt-3 text-center text-xs text-red-500">{generateError}</p>
                )}
              </div>
            )}

            {/* Step 3: Form fields (shown after choosing method or in edit mode) */}
            {showForm && (
              <>
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
                  <div className="rounded-lg border border-bg-300 dark:border-bg-700 p-3">
                    <BlockEditor
                      value={form.description}
                      onChange={(val) => setForm((f) => ({ ...f, description: val }))}
                      placeholder="Write the full project description here..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <Tooltip tip="cancel">
                    <Link
                      to={isAdmin ? "/admin/dashboard" : "/"}
                      className="rounded-lg border border-bg-300 px-5 py-2.5 text-sm font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
                    >
                      Cancel
                    </Link>
                  </Tooltip>
                  <Tooltip tip={isEdit ? "saveChanges" : "createPost"}>
                    <button
                      type="submit"
                      disabled={isSubmitting || githubStatus === "not-owner"}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Post"}
                    </button>
                  </Tooltip>
                </div>
              </>
            )}
          </form>
        )}
      </main>
    </div>
  )
}

export default CreatePost
