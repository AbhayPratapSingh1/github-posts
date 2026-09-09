import request, { API_BASE } from "./client.js"

function getToken() {
  return localStorage.getItem("session_token") || localStorage.getItem("admin_token")
}

function authHeaders(extra = {}) {
  const headers = { ...extra }
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export const getPosts = (offset = 0, limit = 12) =>
  request(`/posts?offset=${offset}&limit=${limit}`)

export const getPostById = (id) => request(`/posts/${id}`)

export const createPost = (data) =>
  request("/posts", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })

export const updatePost = (id, data) =>
  request(`/posts/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })

export const adminUpdatePost = (id, data) =>
  request(`/admin/posts/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  })

export const deletePost = (id) =>
  request(`/posts/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  })

export const getGithubInfo = async (url) => {
  const res = await fetch(`${API_BASE}/github/info?url=${encodeURIComponent(url)}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to fetch repo info (${res.status})`)
  }
  return res.json()
}

export const generatePostContent = async (url) => {
  const res = await fetch(`${API_BASE}/github/generate?url=${encodeURIComponent(url)}`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to generate content (${res.status})`)
  }
  return res.json()
}
