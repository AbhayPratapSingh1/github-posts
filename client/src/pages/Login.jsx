import { FaGithub } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

function Login() {
  const { user, loading, login, checkAuth } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [userid, setUserid] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true })
  }, [user, loading, navigate])

  const handleLogin = async () => {
    const ok = await login(userid, password)
    if (ok) navigate("/", { replace: true })
    else addToast("Invalid credentials", "error")
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Post Panel</h1>
          <p className="mt-2 text-fg-500 dark:text-fg-400">
            Sign in to manage your project showcase
          </p>
        </div>
        {error && (
          <p className="mt-2 text-red-500 dark:text-red-400 text-sm">{error}</p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-600 dark:text-fg-400 mb-1">
              User ID
            </label>
            <input
              value={userid}
              onChange={(e) => setUserid(e.target.value)}
              placeholder="admin"
              className="w-full rounded-lg bg-bg-50 px-3 py-2 border border-bg-300 text-fg-900 dark:bg-bg-900 dark:text-fg-100 dark:border-bg-700 focus:outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-600 dark:text-fg-400 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="12345"
              className="w-full rounded-lg bg-bg-50 px-3 py-2 border border-bg-300 text-fg-900 dark:bg-bg-900 dark:text-fg-100 dark:border-bg-700 focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            onClick={handleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-bg-900 px-6 py-3 text-base font-semibold text-bg-50 shadow-lg hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login