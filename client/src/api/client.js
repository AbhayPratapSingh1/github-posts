export const API_BASE = "/api"

export const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  return res.json()
}

export default request