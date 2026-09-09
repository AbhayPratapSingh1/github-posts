import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FaShieldAlt, FaSpinner } from "react-icons/fa"
import { API_BASE } from "../api/client"
import Logo from "../components/Logo"

function AdminLogin() {
  const [githubId, setGithubId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("admin_token")
    if (token) navigate("/admin/dashboard", { replace: true })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_id: parseInt(githubId),
          password,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      localStorage.setItem("admin_token", data.token)
      localStorage.setItem("admin_user", JSON.stringify(data.user))
      navigate("/admin/dashboard", { replace: true })
    } catch {
      setError("Connection failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <Logo className="mx-auto size-14" />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Admin Panel</h1>
          <p className="mt-2 text-fg-500 dark:text-fg-400">
            Sign in with your admin credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">GitHub User ID</label>
            <input
              type="number"
              value={githubId}
              onChange={(e) => setGithubId(e.target.value)}
              placeholder="e.g. 47173091"
              required
              className="w-full rounded-lg border border-bg-300 bg-bg-50 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-bg-700 dark:bg-bg-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              className="w-full rounded-lg border border-bg-300 bg-bg-50 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-bg-700 dark:bg-bg-900"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
