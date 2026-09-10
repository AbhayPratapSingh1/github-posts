import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FaShieldAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa"
import { API_BASE } from "../api/client"
import Logo from "../components/Logo"
import Tooltip from "../components/Tooltip"

function AdminLogin() {
  const [status, setStatus] = useState("checking")
  const [verifiedUser, setVerifiedUser] = useState(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const adminToken = localStorage.getItem("admin_token")
    if (adminToken) {
      navigate("/admin/dashboard", { replace: true })
      return
    }

    const sessionToken = localStorage.getItem("session_token")
    if (!sessionToken) {
      setStatus("not_logged_in")
      return
    }

    fetch(`${API_BASE}/admin/check`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((res) => {
        if (res.status === 401) {
          setStatus("not_logged_in")
          return
        }
        if (res.status === 403) {
          setStatus("not_admin")
          return
        }
        return res.json()
      })
      .then((data) => {
        if (data && data.success) {
          setVerifiedUser(data.user)
          setStatus("password")
        }
      })
      .catch(() => setStatus("not_logged_in"))
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_id: verifiedUser.github_id,
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

  if (status === "checking") {
    return (
      <div className="min-h-screen grid place-items-center bg-bg-50 dark:bg-bg-950">
        <FaSpinner className="animate-spin text-2xl text-fg-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <Logo className="mx-auto size-14" />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Admin Panel</h1>
        </div>

        {status === "not_logged_in" && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-fg-500">
              <FaExclamationTriangle />
              <span>Please log in with GitHub first</span>
            </div>
            <Tooltip tip="goLogin" side="bottom" className="w-full">
              <button
                onClick={() => navigate("/login")}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Go to Login
              </button>
            </Tooltip>
          </div>
        )}

        {status === "not_admin" && (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Your account is not authorized for admin access.
            </div>
            <Tooltip tip="goHome" side="bottom" className="w-full">
              <button
                onClick={() => navigate("/")}
                className="w-full rounded-lg border border-bg-300 px-6 py-3 text-base font-medium transition-colors hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-800"
              >
                Go Home
              </button>
            </Tooltip>
          </div>
        )}

        {status === "password" && verifiedUser && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
              <FaCheckCircle className="text-green-500" />
              <div>
                <div className="text-sm font-medium">{verifiedUser.name || verifiedUser.username}</div>
                <div className="text-xs text-fg-500">@{verifiedUser.username}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                className="w-full rounded-lg border border-bg-300 bg-bg-50 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-bg-700 dark:bg-bg-900"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Tooltip tip="adminLogin" side="bottom" className="w-full">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </Tooltip>
          </form>
        )}
      </div>
    </div>
  )
}

export default AdminLogin
