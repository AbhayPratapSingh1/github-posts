import { describe, it, mock, afterEach } from "node:test"
import assert from "node:assert/strict"
import { API_BASE } from "./client.js"
import { getPosts, getPostById } from "./posts.js"

const mockFetchResponse = (data) =>
  mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => data,
  }))

describe("posts api", () => {
  afterEach(() => mock.restoreAll())

  it("getPosts fetches the full list of posts", async () => {
    const posts = [{ id: "alien-attack" }, { id: "fall-ball" }]
    mockFetchResponse(posts)

    const result = await getPosts()

    assert.deepEqual(result, posts)
    const [calledUrl] = globalThis.fetch.mock.calls[0].arguments
    assert.equal(calledUrl, `${API_BASE}/posts`)
  })

  it("getPostById fetches a single post with the given id", async () => {
    const post = { id: "alien-attack", title: "Alien Attack" }
    mockFetchResponse(post)

    const result = await getPostById("alien-attack")

    assert.deepEqual(result, post)
    const [calledUrl] = globalThis.fetch.mock.calls[0].arguments
    assert.equal(calledUrl, `${API_BASE}/posts/alien-attack`)
  })
})