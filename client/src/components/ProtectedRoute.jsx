import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
        <p className="text-fg-500 dark:text-fg-400">Loading...</p>
      </div>
    )
  }

  const hasAdminToken = Boolean(localStorage.getItem("admin_token"))

  if (!user && !hasAdminToken) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
