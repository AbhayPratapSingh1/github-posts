import request from "./client.js"

export const getPosts = () => request("/posts")

export const getPostById = (id) => request(`/posts/${id}`)