import { useState } from "react"
import { Link } from "react-router-dom"
import { FaPaperPlane, FaSpinner, FaArrowLeft, FaUserSecret, FaCheckCircle } from "react-icons/fa"
import { submitFeedback, getMyFeedback } from "../api/posts"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import ProfileMenu from "../components/ProfileMenu"
import Logo from "../components/Logo"
import { useEffect } from "react"

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "improvement", label: "Improvement" },
]

function Feedback() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [myFeedback, setMyFeedback] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (user) {
      setLoadingHistory(true)
      getMyFeedback()
        .then((data) => setMyFeedback(data))
        .catch(() => {})
        .finally(() => setLoadingHistory(false))
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      await submitFeedback(trimmed, category, isAnonymous)
      setSubmitted(true)
      setContent("")
      setCategory("general")
      addToast("Feedback submitted!", "success")
      if (user && !isAnonymous) {
        getMyFeedback().then((data) => setMyFeedback(data)).catch(() => {})
      }
    } catch {
      addToast("Failed to submit feedback", "error")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
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
        <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <FaCheckCircle className="mx-auto text-5xl text-emerald-500" />
          <h1 className="mt-6 text-3xl font-extrabold">Thank you!</h1>
          <p className="mt-3 text-fg-600 dark:text-fg-400">Your feedback has been submitted successfully.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Submit another
            </button>
            <Link
              to="/"
              className="rounded-lg border border-bg-300 px-5 py-2.5 text-sm font-medium hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-900"
            >
              Go Home
            </Link>
          </div>
        </main>
      </div>
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

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-bg-300 px-3 py-1.5 text-sm font-medium text-fg-600 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-bg-700 dark:text-fg-400 dark:hover:border-primary-600 dark:hover:text-primary-400"
        >
          <FaArrowLeft className="text-xs" />
          Back
        </Link>

        <p className="mb-3 text-xs font-semibold tracking-widest text-primary-600 uppercase dark:text-primary-400">
          Feedback
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Share your thoughts
        </h1>
        <p className="mt-4 max-w-xl text-lg text-fg-600 dark:text-fg-400">
          Report bugs, suggest features, or share general feedback.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-700 dark:text-fg-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-bg-300 bg-bg-100 px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-700 dark:text-fg-300">Your feedback</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell us what you think..."
              rows={5}
              maxLength={1000}
              className="w-full rounded-lg border border-bg-300 bg-bg-100 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900"
            />
            <p className="mt-1 text-xs text-fg-400">{content.length}/1000</p>
          </div>

          {user && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="size-4 rounded border-bg-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="flex items-center gap-2 text-sm text-fg-600 dark:text-fg-400">
                <FaUserSecret className="text-fg-400" />
                Submit anonymously
              </span>
            </label>
          )}

          {!user && (
            <p className="text-sm text-fg-500 dark:text-fg-400">
              You're submitting as anonymous.{" "}
              <Link to="/login" className="text-primary-600 hover:underline dark:text-primary-400">Sign in</Link>{" "}
              to track your feedback.
            </p>
          )}

          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
            Submit feedback
          </button>
        </form>

        {user && myFeedback.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg font-bold">Your previous feedback</h2>
            <div className="mt-4 space-y-3">
              {myFeedback.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-bg-200 bg-bg-100 p-4 dark:border-bg-800 dark:bg-bg-900"
                >
                  <div className="flex items-center gap-2 text-xs text-fg-500 dark:text-fg-400">
                    <span className="rounded-full bg-primary-600/10 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-400">
                      {CATEGORIES.find((c) => c.value === f.category)?.label || f.category}
                    </span>
                    {f.is_anonymous && <FaUserSecret className="text-fg-400" />}
                    <span>{new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <p className="mt-2 text-sm text-fg-800 dark:text-fg-200">{f.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Feedback
