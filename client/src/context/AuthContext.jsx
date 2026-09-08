import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { API_BASE } from "../api/client"
import { useToast } from "./ToastContext"

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

function clearAuth() {
  localStorage.removeItem("session_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user")
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

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
    } catch (e) {
      console.error("[AuthContext] checkAuth failed:", e)
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
          window.history.replaceState({}, "", window.location.pathname)
          addToast(`Signed in as ${userData.username}`, "success")
        } catch (e) {
          console.error("[AuthContext] OAuth decode failed:", e)
          addToast("Sign-in failed. Please try again.", "error")
          window.history.replaceState({}, "", window.location.pathname)
          checkAuth()
        }
      } else {
        checkAuth()
      }
    } catch (e) {
      console.error("[AuthContext] Auth init failed:", e)
      setLoading(false)
    }
  }, [checkAuth, addToast])

  const login = async (userid, password) => {
    try {
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
      addToast(data.error || "Login failed", "error")
      return false
    } catch (e) {
      console.error("[AuthContext] login failed:", e)
      addToast("Login failed. Please try again.", "error")
      return false
    }
  }

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
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
