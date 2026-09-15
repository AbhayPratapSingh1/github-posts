import { config } from "../config/env"

export const API_BASE = config.apiBase

let isRefreshing = false
let refreshPromise = null
let onAuthClear = null

export function setAuthClearHandler(handler) {
  onAuthClear = handler
}

function getToken() {
  return localStorage.getItem("session_token") || localStorage.getItem("admin_token")
}

function clearAuth() {
  localStorage.removeItem("session_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("admin_token")
  localStorage.removeItem("admin_user")
  localStorage.removeItem("user")
  if (onAuthClear) onAuthClear()
}

const refreshToken = async () => {
  try {
    const refreshTokenValue = localStorage.getItem("refresh_token")
    const headers = {}
    if (refreshTokenValue) {
      headers["Authorization"] = `Bearer ${refreshTokenValue}`
    }
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers,
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem("session_token", data.access_token)
    }
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token)
    }
    return true
  } catch {
    return false
  }
}

const throwForResponse = async (res) => {
  const body = typeof res.json === "function" ? await res.json().catch(() => ({})) : {}
  const error = new Error(body.error || `Request failed: ${res.status} ${res.statusText}`)
  error.status = res.status
  throw error
}

export const request = async (path, options = {}) => {
  try {
    const token = getToken()
    const headers = { ...(options.headers || {}) }
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`
    }
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers,
    })

    if (res.status === 401 && !path.includes("/auth/")) {
      if (isRefreshing && refreshPromise) {
        const refreshResult = await refreshPromise
        if (!refreshResult) {
          clearAuth()
          throw new Error("Session expired. Please log in again.")
        }
      } else {
        isRefreshing = true
        refreshPromise = refreshToken().finally(() => {
          isRefreshing = false
          refreshPromise = null
        })

        const refreshResult = await refreshPromise
        if (!refreshResult) {
          clearAuth()
          throw new Error("Session expired. Please log in again.")
        }
      }

      const newToken = getToken()
      const retryHeaders = { ...(options.headers || {}) }
      if (newToken && !retryHeaders["Authorization"]) {
        retryHeaders["Authorization"] = `Bearer ${newToken}`
      }
      const retryRes = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        ...options,
        headers: retryHeaders,
      })
      if (!retryRes.ok) await throwForResponse(retryRes)
      return retryRes.json()
    }

    if (!res.ok) await throwForResponse(res)
    return res.json()
  } catch (e) {
    throw e
  }
}

export default request
