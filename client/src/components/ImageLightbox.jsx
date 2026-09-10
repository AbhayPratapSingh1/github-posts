import { useState, useEffect, useCallback, useRef } from "react"
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import Tooltip from "./Tooltip"

export default function ImageLightbox({ images, startIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const containerRef = useRef(null)

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const focusable = el.querySelectorAll("button")
    if (focusable.length) focusable[0].focus()

    const getFocusable = () =>
      el.querySelectorAll("button")

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

    const handleKey = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }

    document.addEventListener("keydown", handleKey)
    el.addEventListener("keydown", trap)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      el.removeEventListener("keydown", trap)
      document.body.style.overflow = ""
    }
  }, [onClose, goNext, goPrev])

  if (!images.length) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <Tooltip tip="close" side="left" className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Close"
        >
          <FaTimes />
        </button>
      </Tooltip>

      {images.length > 1 && (
        <Tooltip tip="prevImage" side="bottom" className="absolute left-4 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <FaChevronLeft />
          </button>
        </Tooltip>
      )}

      <img
        src={images[currentIndex]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
      />

      {images.length > 1 && (
        <Tooltip tip="nextImage" side="bottom" className="absolute right-4 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <FaChevronRight />
          </button>
        </Tooltip>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
