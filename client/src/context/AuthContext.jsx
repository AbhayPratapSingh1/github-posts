import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { API_BASE } from "../api/client"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // ignore
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
