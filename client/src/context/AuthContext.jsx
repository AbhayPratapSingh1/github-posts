import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { API_BASE } from "../api/client"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    setLoading(true)
    try {
      console.log("[DEBUG checkAuth] API_BASE:", API_BASE)
      console.log("[DEBUG checkAuth] Fetching:", `${API_BASE}/auth/me`)
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      console.log("[DEBUG checkAuth] Response status:", res.status)
      console.log("[DEBUG checkAuth] Response headers:", Object.fromEntries(res.headers.entries()))
      const data = await res.json()
      console.log("[DEBUG checkAuth] Data received:", data)
      setUser(data.user)
    } catch (e) {
      console.log("[DEBUG checkAuth] Error:", e)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (userid, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userid, password }),
    })
    const data = await res.json()
    if (res.ok) {
      setUser(data.user)
      return true
    }
    return false
  }

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
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}