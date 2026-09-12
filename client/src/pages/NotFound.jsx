import { Link } from "react-router-dom"
import Logo from "../components/Logo"

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <Logo className="mb-6 size-10" />
      <h1 className="text-6xl font-extrabold tracking-tight">404</h1>
      <p className="mt-3 text-lg text-fg-500 dark:text-fg-400">
        Page not found
      </p>
      <Link
        to="/"
        className="mt-8 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Go home
      </Link>
    </div>
  )
}

export default NotFound
