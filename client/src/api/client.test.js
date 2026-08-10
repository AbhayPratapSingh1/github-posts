import { describe, it, mock, afterEach } from "node:test"
import assert from "node:assert/strict"
import request, { API_BASE } from "./client.js"

describe("request", () => {
  afterEach(() => mock.restoreAll())

  it("prepends API_BASE to the path and returns parsed JSON", async () => {
    mock.method(globalThis, "fetch", async (url) => ({
      ok: true,
      json: async () => ({ message: "Post Panel API" }),
    }))

    const data = await request("/posts")

    assert.deepEqual(data, { message: "Post Panel API" })
    const [calledUrl] = globalThis.fetch.mock.calls[0].arguments
    assert.equal(calledUrl, `${API_BASE}/posts`)
  })

  it("throws when the response is not ok", async () => {
    mock.method(globalThis, "fetch", async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }))

    await assert.rejects(() => request("/posts/unknown"), /404 Not Found/)
  })

  it("propagates network errors", async () => {
    mock.method(globalThis, "fetch", async () => {
      throw new TypeError("fetch failed")
    })

    await assert.rejects(() => request("/posts"), /fetch failed/)
  })
})