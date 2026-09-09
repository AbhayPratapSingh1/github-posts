import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FaTrash, FaSignOutAlt, FaUsers, FaFileAlt, FaStar, FaCodeBranch, FaExternalLinkAlt } from "react-icons/fa"
import { API_BASE } from "../api/client"
import Logo from "../components/Logo"

function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("posts")
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("admin_token")
    if (!token) {
      navigate("/admin", { replace: true })
      return
    }

    fetch(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized")
        return res.json()
      })
      .then(setData)
      .catch(() => {
        localStorage.removeItem("admin_token")
        localStorage.removeItem("admin_user")
        navigate("/admin", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const handleDeletePost = async (postId) => {
    if (!confirm("Delete this post?")) return
    const token = localStorage.getItem("admin_token")
    try {
      const res = await fetch(`${API_BASE}/admin/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          posts: prev.posts.filter((p) => p.id !== postId),
          stats: { ...prev.stats, totalPosts: prev.stats.totalPosts - 1 },
        }))
      }
    } catch {
      // ignore
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_user")
    navigate("/admin", { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg-50 dark:bg-bg-950">
        <div className="text-fg-500">Loading dashboard...</div>
      </div>
    )
  }

  if (!data) return null

  const stats = data.stats
  const statCards = [
    { label: "Total Posts", value: stats.totalPosts, icon: FaFileAlt, color: "text-blue-500" },
    { label: "Total Users", value: stats.totalUsers, icon: FaUsers, color: "text-green-500" },
    { label: "Total Stars", value: stats.totalStars, icon: FaStar, color: "text-yellow-500" },
    { label: "Total Forks", value: stats.totalForks, icon: FaCodeBranch, color: "text-purple-500" },
  ]

  return (
    <div className="min-h-screen bg-bg-50 text-fg-900 dark:bg-bg-950 dark:text-fg-100">
      <header className="sticky top-0 z-40 border-b border-bg-200 bg-bg-50/80 backdrop-blur dark:border-bg-800 dark:bg-bg-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="size-8" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-bg-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-bg-100 dark:border-bg-700 dark:hover:bg-bg-800"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-bg-200 bg-bg-50 p-5 shadow-sm dark:border-bg-800 dark:bg-bg-900">
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg-500">{s.label}</span>
                <s.icon className={`text-lg ${s.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex gap-1 border-b border-bg-200 dark:border-bg-800">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "posts"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-fg-500 hover:text-fg-700"
              }`}
            >
              Posts ({data.posts.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-fg-500 hover:text-fg-700"
              }`}
            >
              Users ({data.users.length})
            </button>
            <button
              onClick={() => setActiveTab("languages")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "languages"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-fg-500 hover:text-fg-700"
              }`}
            >
              Languages
            </button>
          </div>

          {activeTab === "posts" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-bg-200 bg-bg-100 text-xs uppercase text-fg-500 dark:border-bg-800 dark:bg-bg-800">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Stars</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.posts.map((post) => (
                    <tr key={post.id} className="border-b border-bg-100 dark:border-bg-800/50">
                      <td className="px-4 py-3 font-medium">
                        <a href={`/post/${post.id}`} target="_blank" rel="noreferrer" className="hover:underline">
                          {post.title}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          post.type === "playable" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : post.type === "hosted" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {post.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{post.language || "-"}</td>
                      <td className="px-4 py-3">{post.githubOwner || "-"}</td>
                      <td className="px-4 py-3">{(post.stats || {}).stars || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {post.github && (
                            <a
                              href={post.github}
                              target="_blank"
                              rel="noreferrer"
                              className="text-fg-400 hover:text-fg-700"
                            >
                              <FaExternalLinkAlt />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "users" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-bg-200 bg-bg-100 text-xs uppercase text-fg-500 dark:border-bg-800 dark:bg-bg-800">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">GitHub ID</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Bio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-b border-bg-100 dark:border-bg-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url && (
                            <img src={u.avatar_url} alt="" className="size-8 rounded-full" />
                          )}
                          <div>
                            <div className="font-medium">{u.name || u.username}</div>
                            <div className="text-xs text-fg-500">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{u.github_id}</td>
                      <td className="px-4 py-3">{u.email || "-"}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{u.bio || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "languages" && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Object.entries(stats.languages)
                .sort((a, b) => b[1] - a[1])
                .map(([lang, count]) => (
                  <div key={lang} className="rounded-lg border border-bg-200 bg-bg-50 p-4 dark:border-bg-800 dark:bg-bg-900">
                    <div className="text-sm font-medium">{lang}</div>
                    <div className="mt-1 text-2xl font-bold">{count}</div>
                    <div className="text-xs text-fg-500">posts</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
