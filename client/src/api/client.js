import { config } from "../config/env"

export const API_BASE = config.apiBase

let isRefreshing = false
let refreshPromise = null

function getToken() {
  return localStorage.getItem("session_token")
}

const refreshToken = async () => {
  try {
    const token = getToken()
    const headers = {}
    if (token) headers["Authorization"] = `Bearer ${token}`
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
    return true
  } catch {
    return false
  }
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
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = refreshToken().finally(() => {
          isRefreshing = false
          refreshPromise = null
        })
      }

      await refreshPromise

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
      if (!retryRes.ok) throw new Error(`Request failed: ${retryRes.status} ${retryRes.statusText}`)
      return retryRes.json()
    }

    if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    return res.json()
  } catch (e) {
    throw e
  }
}

export default request
