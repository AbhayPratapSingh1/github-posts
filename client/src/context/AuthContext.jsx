import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { API_BASE } from "../api/client"

const AuthContext = createContext(null)

function getToken() {
  return localStorage.getItem("session_token")
}

function setToken(token) {
  localStorage.setItem("session_token", token)
}

function clearToken() {
  localStorage.removeItem("session_token")
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    setLoading(true)
    try {
      const token = getToken()
      const hasToken = !!token
      const headers = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      console.log("[DEBUG AuthContext] checkAuth → hasToken:", hasToken, "| header present:", !!headers["Authorization"])
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
        headers,
      })
      const data = await res.json()
      console.log("[DEBUG AuthContext] /auth/me response:", data.user ? `user=${data.user.username}` : "null")
      if (data.user) {
        setUser(data.user)
      } else {
        clearToken()
        setUser(null)
      }
    } catch (e) {
      console.log("[DEBUG AuthContext] checkAuth error:", e)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const url = window.location.href
    console.log("[DEBUG AuthContext] Current URL:", url)
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    const refresh = params.get("refresh")
    const userB64 = params.get("user")

    console.log("[DEBUG AuthContext] URL params - token:", token ? token.substring(0, 50) + "..." : "null")
    console.log("[DEBUG AuthContext] URL params - user:", userB64 ? "present" : "null")

    if (token && userB64) {
      try {
        const decoded = decodeURIComponent(userB64)
        const userData = JSON.parse(atob(decoded))
        setToken(token)
        localStorage.setItem("refresh_token", refresh || "")
        localStorage.setItem("user", JSON.stringify(userData))
        setUser(userData)
        window.history.replaceState({}, "", window.location.pathname)
        console.log("[DEBUG AuthContext] ✅ OAuth success — user:", userData.username, "| token stored:", !!token)
      } catch (e) {
        console.log("[DEBUG AuthContext] ❌ Failed to decode user from URL:", e.message)
        checkAuth()
      }
    } else {
      console.log("[DEBUG AuthContext] No URL params → calling checkAuth (token in localStorage:", !!getToken(), ")")
      checkAuth()
    }
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
    clearToken()
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
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
