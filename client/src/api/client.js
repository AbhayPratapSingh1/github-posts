import { config } from "../config/env"

export const API_BASE = config.apiBase

let isRefreshing = false
let refreshPromise = null

const refreshToken = async () => {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
  return res.ok
}

export const request = async (path, options = {}) => {
  console.log("[DEBUG request]", `${API_BASE}${path}`)
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
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

    const retryRes = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
    })
    if (!retryRes.ok) throw new Error(`Request failed: ${retryRes.status} ${retryRes.statusText}`)
    return retryRes.json()
  }

  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  return res.json()
}

export default request
