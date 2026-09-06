import { useEffect, useRef } from "react"

function Modal({ open, onClose, children }) {
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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "384px",
          borderRadius: "12px",
          border: "1px solid var(--color-bg-200, #e5e5e5)",
          backgroundColor: "var(--color-bg-50, #fafafa)",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          outline: "none",
        }}
        className="dark:border-bg-800 dark:bg-bg-900"
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
