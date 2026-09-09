import { useEffect, useRef } from "react"

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-[90vw]",
}

function Modal({ open, onClose, children, size = "md", className = "" }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = dialogRef.current
    if (!el) return

    el.focus()

    const getFocusable = () =>
      el.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )

    const trap = (e) => {
      if (e.key !== "Tab") return
      const nodes = getFocusable()
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }

    el.addEventListener("keydown", trap)
    window.addEventListener("keydown", onKey)
    return () => {
      el.removeEventListener("keydown", trap)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${sizes[size] || sizes.md} rounded-xl border border-bg-200 bg-bg-50 p-6 shadow-xl outline-none dark:border-bg-700 dark:bg-bg-900 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-fg-400 transition-colors hover:bg-bg-100 hover:text-fg-700 dark:hover:bg-bg-800 dark:hover:text-fg-200"
          aria-label="Close"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
