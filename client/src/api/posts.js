import request, { API_BASE } from "./client.js"

export const getPosts = (offset = 0, limit = 12) =>
  request(`/posts?offset=${offset}&limit=${limit}`)

export const searchPosts = (q, offset = 0, limit = 12) =>
  request(`/posts/search?q=${encodeURIComponent(q)}&offset=${offset}&limit=${limit}`)

export const getPostById = (id) => request(`/posts/${id}`)

export const getPostCommentById = (id) => request(`/posts/${id}/comments`)

export const updateComment = (postId, commentId, content) =>
  request(`/posts/${postId}/comments/${commentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  })

export const deleteComment = (postId, commentId) =>
  request(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  })

export const createComment = (postId, content, parentId = null) =>
  request(`/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, parent_id: parentId }),
  })

export const likeComment = (postId, commentId) =>
  request(`/posts/${postId}/comments/${commentId}/like`, {
    method: "POST",
  })

export const likePost = (id, liked) =>
  request(`/posts/${id}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ liked }),
  })

export const getLikedPosts = () => request("/posts/liked")

export const createPost = (data) =>
  request("/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

export const updatePost = (id, data) =>
  request(`/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

export const adminUpdatePost = (id, data) =>
  request(`/admin/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

export const deletePost = (id) =>
  request(`/posts/${id}`, {
    method: "DELETE",
  })

export const adminDeletePost = (id) =>
  request(`/admin/posts/${id}`, {
    method: "DELETE",
  })

export const deleteAllPosts = () =>
  request("/admin/posts", {
    method: "DELETE",
  })

export const deleteAllUsers = () =>
  request("/admin/users", {
    method: "DELETE",
  })

export const getGithubInfo = async (url) => {
  const res = await fetch(`${API_BASE}/github/info?url=${encodeURIComponent(url)}`, {
    credentials: "include",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to fetch repo info (${res.status})`)
  }
  return res.json()
}

export const generatePostContent = async (url) => request(`/github/generate?url=${encodeURIComponent(url)}`, {
  method: "POST",
})

export const getUserPosts = (username) =>
  request(`/users/${username}/posts`)

export const submitFeedback = (content, category = "general", isAnonymous = false) =>
  request("/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, category, is_anonymous: isAnonymous }),
  })

export const getMyFeedback = () =>
  request("/feedback/mine")

export const getAdminFeedback = () =>
  request("/admin/feedback")

export const deleteFeedback = (id) =>
  request(`/admin/feedback/${id}`, {
    method: "DELETE",
  })
