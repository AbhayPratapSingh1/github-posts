import { config } from "../config/env"

export const API_BASE = config.apiBase

let isRefreshing = false
let refreshPromise = null

export function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

function withCsrfHeader(headers, method) {
  const merged = { ...headers }
  if (method && method !== "GET" && method !== "HEAD") {
    const csrfToken = getCsrfToken()
    if (csrfToken) merged["X-CSRF-Token"] = csrfToken
  }
  return merged
}

const refreshToken = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: withCsrfHeader({}, "POST"),
    })
    return res.ok
  } catch {
    return false
  }
}

export const request = async (path, options = {}) => {
  try {
    const headers = withCsrfHeader(options.headers || {}, options.method)
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

      const retryHeaders = withCsrfHeader(options.headers || {}, options.method)
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
