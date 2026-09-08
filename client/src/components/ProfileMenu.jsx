import { useState } from "react"
import { FaSignOutAlt, FaCalendarAlt, FaEnvelope } from "react-icons/fa"
import Modal from "./Modal"
import { useAuth } from "../context/AuthContext"

function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const formatDate = (dateString) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    } catch {
      return null
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-bg-300 p-0.5 transition-colors hover:border-primary-400 dark:border-bg-700 dark:hover:border-primary-600"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name || user.username}
            className="size-8 rounded-full"
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
            {(user.name || user.username)?.[0]?.toUpperCase() || "?"}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="relative">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.username}
                className="size-20 rounded-full border-4 border-primary-500 shadow-lg"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full border-4 border-primary-500 bg-primary-600 text-2xl font-bold text-white shadow-lg">
                {(user.name || user.username)?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <span className="absolute bottom-0 right-0 size-4 rounded-full border-2 border-bg-50 bg-emerald-500 dark:border-bg-900" />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-bold text-fg-900 dark:text-fg-100">
              {user.name || user.username}
            </h3>
            {user.username && (
              <p className="mt-0.5 text-xs text-fg-400 dark:text-fg-500">
                @{user.username}
              </p>
            )}
            {user.email && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-fg-500 dark:text-fg-400">
                <FaEnvelope className="text-[10px]" />
                {user.email}
              </p>
            )}
            {user.bio ? (
              <p className="mt-2 text-sm text-fg-500 dark:text-fg-400">
                {user.bio}
              </p>
            ) : (
              <p className="mt-2 text-sm text-fg-400 dark:text-fg-500">
                No bio yet
              </p>
            )}
            {user.created_at && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-fg-400 dark:text-fg-500">
                <FaCalendarAlt className="text-[10px]" />
                Joined {formatDate(user.created_at)}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
          >
            <FaSignOutAlt className="text-xs" />
            Sign out
          </button>
        </div>
      </Modal>
    </>
  )
}

export default ProfileMenu
