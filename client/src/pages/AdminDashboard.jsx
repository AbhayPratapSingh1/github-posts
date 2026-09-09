import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FaTrash, FaSignOutAlt, FaUsers, FaFileAlt, FaStar, FaCodeBranch, FaExternalLinkAlt, FaEdit, FaEye, FaInfoCircle } from "react-icons/fa"
import { API_BASE } from "../api/client"
import Logo from "../components/Logo"
import Modal from "../components/Modal"

function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("posts")
  const [detailPost, setDetailPost] = useState(null)
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
        setDetailPost(null)
      }
    } catch {
      // ignore
    }
  }

  const handleEdit = (postId) => {
    navigate(`/admin/post/${postId}/edit`)
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_user")
    navigate("/admin", { replace: true })
  }

  const formatDate = (ts) => {
    if (!ts) return "-"
    const d = new Date(typeof ts === "number" ? ts * 1000 : ts)
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const formatISO = (iso) => {
    if (!iso) return "-"
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(post.id)}
                            title="Edit"
                            className="rounded p-1.5 text-fg-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                          >
                            <FaEdit />
                          </button>
                          <a
                            href={`/post/${post.id}`}
                            target="_blank"
                            rel="noreferrer"
                            title="View"
                            className="rounded p-1.5 text-fg-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30"
                          >
                            <FaEye />
                          </a>
                          <button
                            onClick={() => setDetailPost(post)}
                            title="Details"
                            className="rounded p-1.5 text-fg-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/30"
                          >
                            <FaInfoCircle />
                          </button>
                          {post.github && (
                            <a
                              href={post.github}
                              target="_blank"
                              rel="noreferrer"
                              title="GitHub"
                              className="rounded p-1.5 text-fg-400 hover:bg-bg-200 hover:text-fg-700 dark:hover:bg-bg-700"
                            >
                              <FaExternalLinkAlt />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            title="Delete"
                            className="rounded p-1.5 text-fg-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
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

      <Modal open={Boolean(detailPost)} onClose={() => setDetailPost(null)} size="lg">
        {detailPost && (
          <>
            <h2 className="text-lg font-bold mb-4">Post Details</h2>
            <div className="space-y-5">
              <div>
                <div className="text-xs uppercase text-fg-500">Title</div>
                <div className="mt-1 font-medium">{detailPost.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase text-fg-500">ID</div>
                  <div className="mt-1 font-mono text-sm">{detailPost.id}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-fg-500">Type</div>
                  <div className="mt-1">{detailPost.type}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-fg-500">Language</div>
                  <div className="mt-1">{detailPost.language || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-fg-500">Owner</div>
                  <div className="mt-1">{detailPost.githubOwner || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-fg-500">User ID</div>
                  <div className="mt-1">{detailPost.user_id || "-"}</div>
                </div>
              </div>

              <div className="border-t border-bg-200 dark:border-bg-700 pt-4">
                <h3 className="text-sm font-semibold text-fg-700 dark:text-fg-300 mb-3">GitHub Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-fg-500">Repo Created</div>
                    <div className="mt-1">{formatDate(detailPost.dateOfCreation)}</div>
                  </div>
                </div>
                {detailPost.github && (
                  <div className="mt-3">
                    <div className="text-xs uppercase text-fg-500">GitHub URL</div>
                    <a href={detailPost.github} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-blue-500 hover:underline break-all">
                      {detailPost.github}
                    </a>
                  </div>
                )}
                {detailPost.stats && (
                  <div className="mt-3">
                    <div className="text-xs uppercase text-fg-500">Stats</div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span><FaStar className="mr-1 inline text-yellow-500" />{detailPost.stats.stars || 0}</span>
                      <span><FaCodeBranch className="mr-1 inline text-purple-500" />{detailPost.stats.forks || 0}</span>
                      <span>Watchers: {detailPost.stats.watchers || 0}</span>
                      <span>Issues: {detailPost.stats.openIssues || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-bg-200 dark:border-bg-700 pt-4">
                <h3 className="text-sm font-semibold text-fg-700 dark:text-fg-300 mb-3">Post Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-fg-500">Post Created</div>
                    <div className="mt-1">{formatISO(detailPost.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-fg-500">Last Updated</div>
                    <div className="mt-1">{formatISO(detailPost.updated_at)}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-bg-200 dark:border-bg-700 pt-4">
                <div className="text-xs uppercase text-fg-500">Short Description</div>
                <div className="mt-1 text-sm">{detailPost.shortDescription || "-"}</div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-bg-200 dark:border-bg-700">
              <button
                onClick={() => {
                  handleEdit(detailPost.id)
                  setDetailPost(null)
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <FaEdit /> Edit
              </button>
              <button
                onClick={() => handleDeletePost(detailPost.id)}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <FaTrash /> Delete
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

export default AdminDashboard
