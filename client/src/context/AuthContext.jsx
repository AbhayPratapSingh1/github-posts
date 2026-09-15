import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { API_BASE, setAuthClearHandler } from "../api/client"

const AuthContext = createContext(null)

function getToken() {
  return localStorage.getItem("session_token")
}

function setToken(token) {
  localStorage.setItem("session_token", token)
}

function clearAuth() {
  localStorage.removeItem("session_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user")
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setAuthClearHandler(() => {
      setUser(null)
    })
    return () => setAuthClearHandler(null)
  }, [])

  const checkAuth = useCallback(async () => {
    setLoading(true)
    try {
      const token = getToken()
      const headers = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
        headers,
      })
      if (!res.ok) {
        clearAuth()
        setUser(null)
        return
      }
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
      } else {
        clearAuth()
        setUser(null)
      }
    } catch {
      clearAuth()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get("token")
      const refresh = params.get("refresh")
      const userJson = params.get("user")

      if (token && userJson) {
        try {
          const userData = JSON.parse(decodeURIComponent(userJson))
          setToken(token)
          localStorage.setItem("refresh_token", refresh || "")
          localStorage.setItem("user", JSON.stringify(userData))
          setUser(userData)
          setLoading(false)
          window.history.replaceState({}, "", window.location.pathname)
        } catch {
          window.history.replaceState({}, "", window.location.pathname)
          setLoading(false)
          checkAuth()
        }
      } else {
        checkAuth()
      }
    } catch {
      setLoading(false)
    }
  }, [checkAuth])

  const logout = async () => {
    try {
      const token = getToken()
      const headers = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers,
      })
    } catch {
      // ignore
    }
    clearAuth()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
