import { createContext, useContext, useState, useCallback } from "react"

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = "error", duration = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all animate-slide-in ${
              toast.type === "error"
                ? "border-red-300 bg-red-50/90 text-red-700 dark:border-red-700 dark:bg-red-950/90 dark:text-red-400"
                : toast.type === "success"
                ? "border-emerald-300 bg-emerald-50/90 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/90 dark:text-emerald-400"
                : "border-bg-300 bg-bg-50/90 text-fg-900 dark:border-bg-700 dark:bg-bg-900/90 dark:text-fg-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
