import request, { API_BASE } from "./client.js"

export const getPosts = () => request("/posts")

export const getPostById = (id) => request(`/posts/${id}`)

export const createPost = (data) =>
  request("/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

export const deletePost = (id) =>
  request(`/posts/${id}`, { method: "DELETE" })

export const getGithubInfo = async (url) => {
  const res = await fetch(`${API_BASE}/github/info?url=${encodeURIComponent(url)}`)
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
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to generate content (${res.status})`)
  }
  return res.json()
}