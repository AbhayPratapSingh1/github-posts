import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "../../context/AuthContext.jsx"
import { ToastProvider } from "../../context/ToastContext.jsx"

function TestComponent() {
  const { user, loading } = useAuth()
  return (
    <div>
      {loading ? <p>Loading...</p> : user ? <p>User: {user.username}</p> : <p>Not logged in</p>}
    </div>
  )
}

function renderWithProviders(ui) {
  return render(
    <ToastProvider>
      <AuthProvider>{ui}</AuthProvider>
    </ToastProvider>
  )
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    window.history.replaceState({}, "", "/")
  })

  it("shows loading initially", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    }))

    renderWithProviders(<TestComponent />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("sets user when authenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, username: "alice", github_id: 123 } }),
    }))

    renderWithProviders(<TestComponent />)
    await waitFor(() => {
      expect(screen.getByText("User: alice")).toBeInTheDocument()
    })
  })

  it("shows not logged in when no user", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    }))

    renderWithProviders(<TestComponent />)
    await waitFor(() => {
      expect(screen.getByText("Not logged in")).toBeInTheDocument()
    })
  })

  it("handles OAuth callback with token in URL", async () => {
    const userData = { id: 1, username: "bob", github_id: 456 }
    window.history.replaceState(
      {},
      "",
      `/?token=test-token&refresh=refresh-token&user=${encodeURIComponent(JSON.stringify(userData))}`
    )

    renderWithProviders(<TestComponent />)
    await waitFor(() => {
      expect(screen.getByText("User: bob")).toBeInTheDocument()
    })
    expect(localStorage.getItem("session_token")).toBe("test-token")
    expect(window.location.search).toBe("")
  })

  it("calls /auth/me on mount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    }))

    renderWithProviders(<TestComponent />)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/me"),
        expect.any(Object)
      )
    })
  })

  it("clears user on logout", async () => {
    // Initial auth check returns a user
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, username: "alice" } }),
    }))

    function LogoutTest() {
      const { user, loading, logout } = useAuth()
      return (
        <div>
          {loading ? <p>Loading...</p> : user ? <p>User: {user.username}</p> : <p>Not logged in</p>}
          <button onClick={logout}>Logout</button>
        </div>
      )
    }

    renderWithProviders(<LogoutTest />)
    await waitFor(() => {
      expect(screen.getByText("User: alice")).toBeInTheDocument()
    })

    // Mock logout endpoint
    fetch.mockResolvedValueOnce({ ok: true })
    // Mock subsequent /auth/me call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: null }),
    })

    await act(async () => {
      screen.getByText("Logout").click()
    })

    await waitFor(() => {
      expect(screen.getByText("Not logged in")).toBeInTheDocument()
    })
  })
})
