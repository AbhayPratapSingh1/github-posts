import { useState, useEffect } from "react"
import { FaArrowUp } from "react-icons/fa"
import Tooltip from "./Tooltip"

function GoToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <Tooltip tip="goToTop" side="left" className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex size-10 items-center justify-center rounded-full bg-bg-900 text-bg-50 shadow-lg transition-opacity hover:bg-bg-800 dark:bg-bg-50 dark:text-bg-950 dark:hover:bg-bg-200"
        aria-label="Go to top"
      >
        <FaArrowUp className="text-sm" />
      </button>
    </Tooltip>
  )
}

export default GoToTop
