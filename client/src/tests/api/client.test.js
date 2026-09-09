import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request, { API_BASE } from "../../api/client.js"

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("request", () => {
  it("prepends API_BASE to the path", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    }))

    const data = await request("/posts")
    expect(data).toEqual({ message: "ok" })
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/posts`,
      expect.objectContaining({ credentials: "include" })
    )
  })

  it("includes Authorization header when token exists", async () => {
    localStorage.setItem("session_token", "test-token-123")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))

    await request("/posts")
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-123",
        }),
      })
    )
  })

  it("does not include Authorization header when no token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))

    await request("/posts")
    const [, options] = fetch.mock.calls[0]
    expect(options.headers?.Authorization).toBeUndefined()
  })

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }))

    await expect(request("/posts/unknown")).rejects.toThrow("404 Not Found")
  })

  it("propagates network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")))

    await expect(request("/posts")).rejects.toThrow("fetch failed")
  })

  it("retries on 401 with refreshed token", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    // First call returns 401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    })
    // Refresh succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "new-token" }),
    })
    // Retry succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "retried" }),
    })

    const data = await request("/protected")
    expect(data).toEqual({ data: "retried" })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe("API_BASE", () => {
  it("is defined", () => {
    expect(API_BASE).toBeDefined()
    expect(typeof API_BASE).toBe("string")
  })
})
