import { describe, it, expect, vi, beforeEach } from "vitest"
import { getPosts, getPostById, createPost, updatePost, deletePost, getGithubInfo, generatePostContent, likePost } from "../../api/posts.js"
import { API_BASE } from "../../api/client.js"

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("getPosts", () => {
  it("calls /posts with default offset=0, limit=12", async () => {
    const mock = vi.fn().mockResolvedValue({ posts: [], total: 0 })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: mock,
    }))

    await getPosts()
    const url = fetch.mock.calls[0][0]
    expect(url).toContain("offset=0")
    expect(url).toContain("limit=12")
  })

  it("passes custom offset and limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [], total: 0 }),
    }))

    await getPosts(24, 6)
    const url = fetch.mock.calls[0][0]
    expect(url).toContain("offset=24")
    expect(url).toContain("limit=6")
  })
})

describe("getPostById", () => {
  it("fetches post by id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "my-post", title: "My Post" }),
    }))

    const post = await getPostById("my-post")
    expect(post.id).toBe("my-post")
    expect(fetch.mock.calls[0][0]).toContain("/posts/my-post")
  })
})

describe("createPost", () => {
  it("sends POST with auth headers", async () => {
    localStorage.setItem("session_token", "tok")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "new-post" }),
    }))

    await createPost({ title: "New Post", type: "playable" })
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tok",
          "Content-Type": "application/json",
        }),
      })
    )
  })
})

describe("updatePost", () => {
  it("sends PUT with correct id", async () => {
    localStorage.setItem("session_token", "tok")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "updated" }),
    }))

    await updatePost("my-post", { title: "Updated" })
    expect(fetch.mock.calls[0][0]).toContain("/posts/my-post")
    expect(fetch.mock.calls[0][1].method).toBe("PUT")
  })
})

describe("deletePost", () => {
  it("sends DELETE request", async () => {
    localStorage.setItem("session_token", "tok")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "deleted" }),
    }))

    await deletePost("to-delete")
    expect(fetch.mock.calls[0][1].method).toBe("DELETE")
    expect(fetch.mock.calls[0][0]).toContain("/posts/to-delete")
  })
})

describe("likePost", () => {
  it("sends explicit liked flag to /posts/:id/like", async () => {
    localStorage.setItem("session_token", "tok")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ liked: true, like_count: 1 }),
    }))

    const res = await likePost("my-post", true)
    expect(res.liked).toBe(true)
    expect(res.like_count).toBe(1)
    expect(fetch.mock.calls[0][0]).toContain("/posts/my-post/like")
    expect(fetch.mock.calls[0][1].method).toBe("POST")
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ liked: true })
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer tok")
  })
})

describe("getGithubInfo", () => {
  it("fetches repo info for valid URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ language: "JS", ownerId: 123 }),
    }))

    const info = await getGithubInfo("https://github.com/user/repo")
    expect(info.language).toBe("JS")
    const url = fetch.mock.calls[0][0]
    expect(url).toContain("github/info")
    expect(url).toContain(encodeURIComponent("https://github.com/user/repo"))
  })

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    }))

    await expect(getGithubInfo("https://github.com/user/none")).rejects.toThrow("Not found")
  })
})

describe("generatePostContent", () => {
  it("sends POST to /github/generate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: "AI Post" }),
    }))

    const result = await generatePostContent("https://github.com/user/repo")
    expect(result.title).toBe("AI Post")
    expect(fetch.mock.calls[0][1].method).toBe("POST")
  })

  it("throws on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    }))

    await expect(generatePostContent("https://github.com/user/repo")).rejects.toThrow("Server error")
  })
})
