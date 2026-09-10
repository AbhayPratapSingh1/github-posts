import { FaGithub } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useEffect } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { API_BASE } from "../api/client"
import Logo from "../components/Logo"
import Tooltip from "../components/Tooltip"

function Login() {
  const { user, loading, checkAuth } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation();

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!loading && user) {
      const from = location.state?.from
      console.log({from, location})
      navigate(
        from
          ? `${from.pathname}${from.search || ""}${from.hash || ""}`
          : "/",
        { replace: true }
      )
    }
}, [user, loading, navigate, location])

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      addToast("GitHub login failed. Please try again.", "error")
      navigate("/login", { replace: true })
    }
  }, [searchParams, addToast, navigate])

  const handleGithubLogin = () => {
    window.location.href = `${API_BASE}/auth/github`
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <Logo className="mx-auto size-14" />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Post Panel</h1>
          <p className="mt-2 text-fg-500 dark:text-fg-400">
            Sign in to manage your project showcase
          </p>
        </div>

<Tooltip tip="signIn" side="bottom" className="w-full">
        <button
          onClick={handleGithubLogin}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-bg-300 bg-bg-50 px-6 py-3 text-base font-semibold shadow-sm transition-colors hover:bg-bg-100 dark:border-bg-700 dark:bg-bg-900 dark:hover:bg-bg-800"
        >
          <FaGithub className="text-xl" />
          Continue with GitHub
        </button>
      </Tooltip>
      </div>
    </div>
  )
}

export default Login
