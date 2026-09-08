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
      const headers = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
        headers,
      })
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
      } else {
        clearToken()
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (window.__AUTH_TOKEN__) {
      setToken(window.__AUTH_TOKEN__)
      localStorage.setItem("refresh_token", window.__REFRESH_TOKEN__)
      localStorage.setItem("user", JSON.stringify(window.__USER__))
      setUser(window.__USER__)
      delete window.__AUTH_TOKEN__
      delete window.__REFRESH_TOKEN__
      delete window.__USER__
    } else {
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
