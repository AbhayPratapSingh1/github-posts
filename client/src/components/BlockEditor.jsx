import { useState, useRef, useCallback, useEffect } from "react"
import {
  FaArrowUp,
  FaArrowDown,
  FaTrash,
  FaPlus,
  FaHeading,
  FaImage,
  FaVideo,
  FaCopy,
  FaCode,
  FaGripVertical,
  FaImages,
  FaPlusCircle,
} from "react-icons/fa"
import { useToast } from "../context/ToastContext"
import Tooltip from "../components/Tooltip"
import ImageLightbox from "../components/ImageLightbox"
import { parseHtmlToBlocks, blocksToMarkdown, blocksToHtml } from "../config/editorBlocks"

const inputClass =
  "rounded-lg border border-bg-300 bg-bg-50 px-3 py-2 text-sm text-fg-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-900 dark:text-fg-100"

const blockTextClass =
  "w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent p-0 font-inherit text-fg-800 outline-none transition-colors focus:border-primary-400/60 focus:bg-bg-50/80 focus:ring-2 focus:ring-primary-500/10 hover:border-dashed hover:border-fg-300 focus:hover:border-solid dark:text-fg-200 dark:focus:bg-bg-900/60 dark:hover:border-fg-600"

const blockStyle = (b) => {
  if (b.type === "heading") {
    const sizes = { 1: "text-3xl font-extrabold", 2: "text-2xl font-bold", 3: "text-xl font-bold" }
    return sizes[b.level] || sizes[2]
  }
  if (b.type === "blockquote") return "text-base italic border-l-4 border-fg-300 dark:border-fg-600 pl-4"
  if (b.type === "code") return "rounded-md bg-bg-100 p-3 font-mono text-sm dark:bg-bg-800 whitespace-pre-wrap"
  if (b.type === "list-item") return ""
  return "text-base leading-relaxed"
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function AutoGrow({ value, onChange, className, placeholder }) {
  const ref = useRef(null)

  const handle = (e) => {
    const el = ref.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
    onChange(e.target.value)
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handle}
      placeholder={placeholder}
      rows={1}
      className={`${blockTextClass} ${className}`}
      onInput={() => {
        const el = ref.current
        if (el) {
          el.style.height = "auto"
          el.style.height = `${el.scrollHeight}px`
        }
      }}
    />
  )
}

function BlockControls({ index, count, onMove, onRemove }) {
  return (
    <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      {index > 0 && (
        <Tooltip tip="moveUp">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            aria-label="Move up"
            className="rounded p-1 text-fg-400 hover:bg-bg-200 hover:text-fg-700 dark:hover:bg-bg-700"
          >
            <FaArrowUp className="size-2.5" />
          </button>
        </Tooltip>
      )}
      {index < count - 1 && (
        <Tooltip tip="moveDown">
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            aria-label="Move down"
            className="rounded p-1 text-fg-400 hover:bg-bg-200 hover:text-fg-700 dark:hover:bg-bg-700"
          >
            <FaArrowDown className="size-2.5" />
          </button>
        </Tooltip>
      )}
      <Tooltip tip="removeBlock">
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label="Remove block"
          className="rounded p-1 text-fg-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
        >
          <FaTrash className="size-2.5" />
        </button>
      </Tooltip>
    </div>
  )
}

function BlockRow({ block, index, count, marker, onChange, onMove, onRemove, onDragStart, onDragOver, onDrop, dragOverIndex, onOpenLightbox }) {
  const update = (patch) => onChange(index, { ...block, ...patch })
  const isDragOver = dragOverIndex === index

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
    onDragStart(index)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    onDragOver(index)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10)
    onDrop(fromIndex, index)
  }

  if (block.type === "image") {
    return (
      <div
        className={`group flex items-start gap-2 rounded-lg p-1 transition-colors ${isDragOver ? "bg-primary-50 dark:bg-primary-950" : ""}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-1 pt-1">
          <FaGripVertical className="size-3 cursor-grab text-fg-400 opacity-0 group-hover:opacity-100" />
          <BlockControls index={index} count={count} onMove={onMove} onRemove={onRemove} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={block.src}
              onChange={(e) => update({ src: e.target.value })}
              placeholder="Image URL or upload file"
              className={`${inputClass} flex-1`}
            />
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-bg-300 px-3 py-2 text-xs font-medium text-fg-500 transition-colors hover:bg-bg-100 dark:border-bg-700 dark:text-fg-400 dark:hover:bg-bg-900">
              <FaImage className="size-3" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const dataUrl = await fileToDataUrl(file)
                  update({ src: dataUrl })
                }}
              />
              Upload
            </label>
          </div>
          {block.src && (
            <div className="relative">
              <img src={block.src} alt={block.alt} className="rounded-lg border border-bg-300 shadow-sm dark:border-bg-700" style={{ width: block.width === "auto" ? "auto" : (block.width || "100%"), maxHeight: block.maxHeight === "auto" ? "none" : (block.maxHeight || 320), objectFit: "contain" }} />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-fg-500 dark:text-fg-400">
                  Width:
                  <select
                    value={block.width || "100%"}
                    onChange={(e) => update({ width: e.target.value })}
                    className="rounded border border-bg-300 bg-bg-50 px-2 py-1 text-xs dark:border-bg-700 dark:bg-bg-900"
                  >
                    <option value="auto">Auto</option>
                    <option value="25%">25%</option>
                    <option value="33%">33%</option>
                    <option value="50%">50%</option>
                    <option value="66%">66%</option>
                    <option value="75%">75%</option>
                    <option value="100%">100%</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-fg-500 dark:text-fg-400">
                  Max height:
                  <select
                    value={block.maxHeight || 320}
                    onChange={(e) => update({ maxHeight: e.target.value === "auto" ? "auto" : parseInt(e.target.value) || 320 })}
                    className="rounded border border-bg-300 bg-bg-50 px-2 py-1 text-xs dark:border-bg-700 dark:bg-bg-900"
                  >
                    <option value="auto">Auto</option>
                    <option value={160}>160px</option>
                    <option value={240}>240px</option>
                    <option value={320}>320px</option>
                    <option value={480}>480px</option>
                    <option value={640}>640px</option>
                  </select>
                </label>
              </div>
            </div>
          )}
          <input
            type="text"
            value={block.alt || ""}
            onChange={(e) => update({ alt: e.target.value })}
            placeholder="Alt text"
            className={`${inputClass} w-full text-xs`}
          />
        </div>
      </div>
    )
  }

  if (block.type === "video") {
    return (
      <div
        className={`group flex items-start gap-2 rounded-lg p-1 transition-colors ${isDragOver ? "bg-primary-50 dark:bg-primary-950" : ""}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-1 pt-1">
          <FaGripVertical className="size-3 cursor-grab text-fg-400 opacity-0 group-hover:opacity-100" />
          <BlockControls index={index} count={count} onMove={onMove} onRemove={onRemove} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={block.url}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="Video URL or upload file"
              className={`${inputClass} flex-1`}
            />
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-bg-300 px-3 py-2 text-xs font-medium text-fg-500 transition-colors hover:bg-bg-100 dark:border-bg-700 dark:text-fg-400 dark:hover:bg-bg-900">
              <FaVideo className="size-3" />
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const dataUrl = await fileToDataUrl(file)
                  update({ url: dataUrl })
                }}
              />
              Upload
            </label>
          </div>
          {block.url && (
            <div className="relative">
              <video key={block.url} src={block.url} controls className="w-full rounded-lg border border-bg-300 shadow-sm dark:border-bg-700" style={{ width: block.width === "auto" ? "auto" : (block.width || "100%"), maxHeight: block.maxHeight === "auto" ? "none" : (block.maxHeight || 400) }} />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-fg-500 dark:text-fg-400">
                  Width:
                  <select
                    value={block.width || "100%"}
                    onChange={(e) => update({ width: e.target.value })}
                    className="rounded border border-bg-300 bg-bg-50 px-2 py-1 text-xs dark:border-bg-700 dark:bg-bg-900"
                  >
                    <option value="auto">Auto</option>
                    <option value="25%">25%</option>
                    <option value="33%">33%</option>
                    <option value="50%">50%</option>
                    <option value="66%">66%</option>
                    <option value="75%">75%</option>
                    <option value="100%">100%</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-fg-500 dark:text-fg-400">
                  Max height:
                  <select
                    value={block.maxHeight || 400}
                    onChange={(e) => update({ maxHeight: e.target.value === "auto" ? "auto" : parseInt(e.target.value) || 400 })}
                    className="rounded border border-bg-300 bg-bg-50 px-2 py-1 text-xs dark:border-bg-700 dark:bg-bg-900"
                  >
                    <option value="auto">Auto</option>
                    <option value={200}>200px</option>
                    <option value={300}>300px</option>
                    <option value={400}>400px</option>
                    <option value={500}>500px</option>
                    <option value={600}>600px</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (block.type === "gallery") {
    const images = block.images || []
    const cols = block.columns || 2
    const mode = block.mode || "truncated"

    const updateGalleryImage = (imgIndex, patch) => {
      const nextImages = images.map((img, i) => (i === imgIndex ? { ...img, ...patch } : img))
      update({ images: nextImages })
    }

    const addGalleryImages = async (files) => {
      const newImages = await Promise.all(
        files.map(async (file) => ({
          id: `gimg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          src: await fileToDataUrl(file),
          alt: file.name.replace(/\.[^.]+$/, ""),
        }))
      )
      update({ images: [...images, ...newImages] })
    }

    const removeGalleryImage = (imgIndex) => {
      update({ images: images.filter((_, i) => i !== imgIndex) })
    }

    const openGalleryLightbox = (startIndex = 0) => {
      const srcs = images.filter((img) => img.src).map((img) => img.src)
      if (srcs.length) onOpenLightbox(srcs, startIndex)
    }

    const showOverlay = mode === "truncated" && images.length > cols
    const displayImages = showOverlay ? images.slice(0, cols) : images
    const remaining = images.length - cols

    return (
      <div
        className={`group flex items-start gap-2 rounded-lg p-1 transition-colors ${isDragOver ? "bg-primary-50 dark:bg-primary-950" : ""}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-1 pt-1">
          <FaGripVertical className="size-3 cursor-grab text-fg-400 opacity-0 group-hover:opacity-100" />
          <BlockControls index={index} count={count} onMove={onMove} onRemove={onRemove} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-fg-500 dark:text-fg-400">Columns:</span>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update({ columns: n })}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    cols === n
                      ? "bg-primary-600 text-white"
                      : "bg-bg-200 text-fg-600 hover:bg-bg-300 dark:bg-bg-700 dark:text-fg-400 dark:hover:bg-bg-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-fg-500 dark:text-fg-400">Mode:</span>
              <button
                type="button"
                onClick={() => update({ mode: "truncated" })}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  mode === "truncated"
                    ? "bg-primary-600 text-white"
                    : "bg-bg-200 text-fg-600 hover:bg-bg-300 dark:bg-bg-700 dark:text-fg-400 dark:hover:bg-bg-600"
                }`}
              >
                +N overlay
              </button>
              <button
                type="button"
                onClick={() => update({ mode: "grid" })}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  mode === "grid"
                    ? "bg-primary-600 text-white"
                    : "bg-bg-200 text-fg-600 hover:bg-bg-300 dark:bg-bg-700 dark:text-fg-400 dark:hover:bg-bg-600"
                }`}
              >
                Full grid
              </button>
            </div>
            <span className="text-xs text-fg-400 dark:text-fg-500">
              {images.length} image{images.length !== 1 ? "s" : ""}
              {showOverlay && ` — showing ${cols} + overlay`}
            </span>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {displayImages.map((img, imgIndex) => {
              const isOverlaySlot = showOverlay && imgIndex === cols - 1
              return (
                <div key={img.id} className="min-w-0 space-y-1">
                  <div
                    className={`relative ${isOverlaySlot ? "cursor-pointer" : ""}`}
                    onClick={isOverlaySlot ? () => openGalleryLightbox(cols) : undefined}
                  >
                    {img.src ? (
                      <img
                        src={img.src}
                        alt={img.alt}
                        className={`h-28 w-full rounded-md border border-bg-300 object-cover shadow-sm sm:h-32 dark:border-bg-700 ${isOverlaySlot ? "brightness-[.6]" : ""}`}
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-md border-2 border-dashed border-bg-300 sm:h-32 dark:border-bg-700">
                        <FaImage className="text-fg-400" />
                      </div>
                    )}
                    {isOverlaySlot && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/40">
                        <span className="text-3xl font-extrabold text-white drop-shadow-md">+{remaining}</span>
                      </div>
                    )}
                    {!isOverlaySlot && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeGalleryImage(imgIndex) }}
                        className="absolute right-1 top-1 z-10 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                      >
                        <FaTrash className="size-2" />
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={img.src}
                    onChange={(e) => updateGalleryImage(imgIndex, { src: e.target.value })}
                    placeholder="Image URL"
                    className={`${inputClass} w-full text-xs`}
                  />
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-bg-300 px-3 py-2 text-xs font-medium text-fg-500 transition-colors hover:bg-bg-100 dark:border-bg-700 dark:text-fg-400 dark:hover:bg-bg-900">
              <FaPlusCircle className="size-3" /> Add Image
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  if (!files.length) return
                  await addGalleryImages(files)
                  e.target.value = ""
                }}
              />
            </label>
          </div>

          {showOverlay && (
            <div className="space-y-1.5 rounded-md border border-bg-200 bg-bg-50 p-2 dark:border-bg-800 dark:bg-bg-900">
              <p className="text-xs font-medium text-fg-500 dark:text-fg-400">All images ({images.length}):</p>
              {images.map((img, imgIndex) => (
                <div key={img.id} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-xs text-fg-400">{imgIndex + 1}.</span>
                  {img.src ? (
                    <img src={img.src} alt={img.alt} className="size-8 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="size-8 shrink-0 rounded border border-dashed border-bg-300 dark:border-bg-700" />
                  )}
                  <input
                    type="url"
                    value={img.src}
                    onChange={(e) => updateGalleryImage(imgIndex, { src: e.target.value })}
                    placeholder="Image URL"
                    className={`${inputClass} flex-1 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(imgIndex)}
                    className="shrink-0 rounded p-1 text-fg-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                  >
                    <FaTrash className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (block.type === "code") {
    return (
      <div
        className={`group flex items-start gap-2 rounded-lg p-1 transition-colors ${isDragOver ? "bg-primary-50 dark:bg-primary-950" : ""}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-1 pt-1">
          <FaGripVertical className="size-3 cursor-grab text-fg-400 opacity-0 group-hover:opacity-100" />
          <BlockControls index={index} count={count} onMove={onMove} onRemove={onRemove} />
        </div>
        <div className="flex-1">
          <textarea
            value={block.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Write code here..."
            rows={4}
            className="w-full resize-y rounded-md border border-bg-300 bg-bg-100 p-3 font-mono text-sm text-fg-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-bg-700 dark:bg-bg-800 dark:text-fg-200"
          />
        </div>
      </div>
    )
  }

  if (block.type === "hr") {
    return (
      <div
        className={`group flex items-center gap-2 rounded-lg p-1 transition-colors ${isDragOver ? "bg-primary-50 dark:bg-primary-950" : ""}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <FaGripVertical className="size-3 cursor-grab text-fg-400 opacity-0 group-hover:opacity-100" />
        <BlockControls index={index} count={count} onMove={onMove} onRemove={onRemove} />
        <hr className="flex-1 border-bg-300 dark:border-bg-700" />
      </div>
    )
  }

  return (
    <div
      className={`group flex items-start gap-2 rounded-lg p-1 transition-colors ${isDragOver ? "bg-primary-50 dark:bg-primary-950" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-1 pt-1">
        <FaGripVertical className="size-3 cursor-grab text-fg-400 opacity-0 group-hover:opacity-100" />
        <BlockControls index={index} count={count} onMove={onMove} onRemove={onRemove} />
      </div>
      <div className="flex-1">
        {marker && <span className="mr-2 select-none text-fg-400">{marker}</span>}
        <AutoGrow
          value={block.text}
          onChange={(text) => update({ text })}
          placeholder="Empty block"
          className={blockStyle(block)}
        />
      </div>
    </div>
  )
}

const addButtonClass = (color) =>
  `flex items-center gap-1.5 rounded-md border border-bg-300 px-2.5 py-1.5 text-xs font-medium text-fg-500 transition-colors hover:bg-bg-100 dark:border-bg-700 dark:text-fg-400 dark:hover:bg-bg-900 ${color || ""}`

export default function BlockEditor({ value, onChange, placeholder }) {
  const { addToast } = useToast()
  const [blocks, setBlocks] = useState(() => parseHtmlToBlocks(value || ""))
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [lightbox, setLightbox] = useState({ open: false, startIndex: 0, images: [] })
  const isInternalUpdate = useRef(false)

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    setBlocks(parseHtmlToBlocks(value || ""))
  }, [value])

  const emitChange = useCallback((nextBlocks) => {
    isInternalUpdate.current = true
    const html = blocksToHtml(nextBlocks)
    onChange(html)
  }, [onChange])

  const updateBlock = useCallback((index, next) => {
    setBlocks((prev) => {
      const nextBlocks = prev.map((b, i) => (i === index ? next : b))
      emitChange(nextBlocks)
      return nextBlocks
    })
  }, [emitChange])

  const moveBlock = useCallback((from, to) => {
    setBlocks((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      emitChange(next)
      return next
    })
  }, [emitChange])

  const removeBlock = useCallback((index) => {
    setBlocks((prev) => {
      const next = prev.filter((_, i) => i !== index)
      emitChange(next)
      return next
    })
  }, [emitChange])

  const addBlock = useCallback((type, extra = {}) => {
    const base = { id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type }
    setBlocks((prev) => {
      const next = [...prev, { ...base, ...extra }]
      emitChange(next)
      return next
    })
  }, [emitChange])

  const handleDragStart = useCallback(() => {}, [])
  const handleDragOver = useCallback((index) => setDragOverIndex(index), [])
  const handleDrop = useCallback((fromIndex, toIndex) => {
    setDragOverIndex(null)
    if (fromIndex !== toIndex) moveBlock(fromIndex, toIndex)
  }, [moveBlock])

  const markerFor = (i) => {
    const b = blocks[i]
    if (!b || b.type !== "list-item") return null
    if (!b.ordered) return "• "
    let num = 1
    for (let j = i - 1; j >= 0 && blocks[j].type === "list-item" && blocks[j].ordered === b.ordered; j--) num++
    return `${num}. `
  }

  const copyOutput = async (kind) => {
    const text = kind === "markdown" ? blocksToMarkdown(blocks) : blocksToHtml(blocks)
    try {
      await navigator.clipboard.writeText(text)
      addToast(kind === "markdown" ? "Markdown copied to clipboard" : "HTML copied to clipboard", "success")
    } catch {
      addToast("Could not copy to clipboard", "error")
    }
  }

  const openLightbox = (images, startIndex = 0) => {
    setLightbox({ open: true, startIndex, images })
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <BlockRow
          key={block.id}
          block={block}
          index={i}
          count={blocks.length}
          marker={markerFor(i)}
          onChange={updateBlock}
          onMove={moveBlock}
          onRemove={removeBlock}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          dragOverIndex={dragOverIndex}
          onOpenLightbox={openLightbox}
        />
      ))}

      {blocks.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-400 dark:text-fg-500">{placeholder || "No content yet. Add a block below."}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Tooltip tip="addBlock">
          <button type="button" onClick={() => addBlock("paragraph", { text: "" })} className={addButtonClass()}>
            <FaPlus className="size-2.5" /> Paragraph
          </button>
        </Tooltip>
        <Tooltip tip="addHeading">
          <button type="button" onClick={() => addBlock("heading", { level: 2, text: "" })} className={addButtonClass()}>
            <FaHeading className="size-2.5" /> H2
          </button>
        </Tooltip>
        <Tooltip tip="addCodeBlock">
          <button type="button" onClick={() => addBlock("code", { text: "" })} className={addButtonClass()}>
            <FaCode className="size-2.5" /> Code
          </button>
        </Tooltip>
        <Tooltip tip="addImage">
          <button type="button" onClick={() => addBlock("image", { src: "", alt: "", width: "100%", maxHeight: 320 })} className={addButtonClass()}>
            <FaImage className="size-2.5" /> Image
          </button>
        </Tooltip>
        <Tooltip tip="addVideo">
          <button type="button" onClick={() => addBlock("video", { url: "", width: "100%", maxHeight: 400 })} className={addButtonClass()}>
            <FaVideo className="size-2.5" /> Video
          </button>
        </Tooltip>
        <Tooltip tip="addGallery">
          <button type="button" onClick={() => addBlock("gallery", { columns: 2, images: [] })} className={addButtonClass()}>
            <FaImages className="size-2.5" /> Gallery
          </button>
        </Tooltip>

        <div className="ml-auto flex items-center gap-2">
          <Tooltip tip="copyMarkdown">
            <button type="button" onClick={() => copyOutput("markdown")} className={addButtonClass()}>
              <FaCopy className="size-2.5" /> Markdown
            </button>
          </Tooltip>
          <Tooltip tip="copyHtml">
            <button type="button" onClick={() => copyOutput("html")} className={addButtonClass()}>
              <FaCopy className="size-2.5" /> HTML
            </button>
          </Tooltip>
        </div>
      </div>

      {lightbox.open && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox({ open: false, startIndex: 0, images: [] })}
        />
      )}
    </div>
  )
}
