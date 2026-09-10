import { describe, it, expect, vi, beforeEach } from "vitest"
import { getUsers } from "../../api/users.js"

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe("getUsers", () => {
  it("fetches the public users list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [{ id: 1, username: "alice", name: "Alice", postCount: 2 }],
        total: 1,
      }),
    }))

    const res = await getUsers()
    expect(res.total).toBe(1)
    expect(res.users[0].username).toBe("alice")
    expect(fetch.mock.calls[0][0]).toContain("/users")
  })
})