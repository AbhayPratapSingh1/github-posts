let blockCounter = 0

const nextId = () => `block-${++blockCounter}-${Date.now()}`

const fillText = (node) => (node.textContent || "").trim()

function elementToBlock(node) {
  const tag = node.tagName.toLowerCase()

  if (/^h[1-6]$/.test(tag)) {
    return { id: nextId(), type: "heading", level: Number(tag[1]), text: fillText(node) }
  }
  if (tag === "p") {
    const img = node.querySelector(":scope > img")
    if (img && !node.textContent.trim()) {
      return {
        id: nextId(),
        type: "image",
        src: img.getAttribute("src") || "",
        alt: img.getAttribute("alt") || "",
        width: "auto",
        maxHeight: 320,
      }
    }
    const video = node.querySelector(":scope > video")
    if (video && !node.textContent.trim()) {
      return {
        id: nextId(),
        type: "video",
        url: video.getAttribute("src") || "",
        width: "auto",
        maxHeight: 400,
      }
    }
    return { id: nextId(), type: "paragraph", text: fillText(node) }
  }
  if (tag === "blockquote") {
    return { id: nextId(), type: "blockquote", text: fillText(node) }
  }
  if (tag === "ul" || tag === "ol") {
    const ordered = tag === "ol"
    return Array.from(node.children)
      .filter((c) => c.tagName.toLowerCase() === "li")
      .map((li) => ({ id: nextId(), type: "list-item", ordered, text: fillText(li) }))
  }
  if (tag === "pre" || tag === "code") {
    return { id: nextId(), type: "code", text: fillText(node) }
  }
  if (tag === "img") {
    return {
      id: nextId(),
      type: "image",
      src: node.getAttribute("src") || "",
      alt: node.getAttribute("alt") || "",
      width: "auto",
      maxHeight: 320,
    }
  }
  if (tag === "video") {
    return {
      id: nextId(),
      type: "video",
      url: node.getAttribute("src") || "",
      width: "auto",
      maxHeight: 400,
    }
  }
  if (tag === "hr") {
    return { id: nextId(), type: "hr" }
  }

  if (tag === "div" && node.classList.contains("gallery-grid")) {
    const style = node.getAttribute("style") || ""
    const colMatch = style.match(/grid-template-columns:\s*repeat\((\d+)/)
    const columns = colMatch ? parseInt(colMatch[1]) : 2
    const mode = node.getAttribute("data-mode") || "grid"

    let images = []
    const imagesJson = node.getAttribute("data-images")
    if (imagesJson) {
      try {
        const parsed = JSON.parse(imagesJson)
        images = parsed.map((img, i) => ({
          id: `gimg-${nextId()}`,
          src: img.src || "",
          alt: img.alt || "",
        }))
      } catch {
        // fallback to parsing child elements
      }
    }

    if (!images.length) {
      for (const child of node.children) {
        const childTag = child.tagName.toLowerCase()
        if (childTag === "img") {
          images.push({
            id: `gimg-${nextId()}`,
            src: child.getAttribute("src") || "",
            alt: child.getAttribute("alt") || "",
          })
        } else if (childTag === "div" && child.classList.contains("gallery-more")) {
          const img = child.querySelector("img")
          if (img) {
            images.push({
              id: `gimg-${nextId()}`,
              src: img.getAttribute("src") || "",
              alt: img.getAttribute("alt") || "",
            })
          }
        }
      }
    }

    return { id: nextId(), type: "gallery", columns, mode, images }
  }

  // Any other block (div, section, figure, ...) becomes an editable paragraph.
  return { id: nextId(), type: "paragraph", text: fillText(node) }
}

export function parseHtmlToBlocks(html) {
  if (!html || typeof html !== "string") return []

  const template = document.createElement("template")
  template.innerHTML = `<div>${html}</div>`
  const root = template.content.firstElementChild
  const blocks = []

  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim()
      if (text) blocks.push({ id: nextId(), type: "paragraph", text })
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue

    const parsed = elementToBlock(node)
    if (Array.isArray(parsed)) {
      blocks.push(...parsed)
    } else {
      blocks.push(parsed)
    }
  }

  return blocks
}

export function blocksToMarkdown(blocks) {
  return (blocks || [])
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `${"#".repeat(b.level || 2)} ${b.text}`
        case "paragraph":
        case "raw":
          return b.text
        case "list-item":
          return `- ${b.text}`
        case "blockquote":
          return b.text.split("\n").map((line) => `> ${line}`).join("\n")
        case "code":
          return `\`\`\`\n${b.text}\n\`\`\``
        case "image":
          return b.src ? `![${b.alt || ""}](${b.src})` : ""
        case "gallery":
          return (b.images || [])
            .filter((img) => img.src)
            .map((img) => `![${img.alt || ""}](${img.src})`)
            .join("\n\n")
        case "video":
          return b.url ? `[Video](${b.url})` : ""
        case "hr":
          return "---"
        default:
          return b.text
      }
    })
    .filter((part) => part !== "")
    .join("\n\n")
}

const escapeHtml = (str) =>
  (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

export function blocksToHtml(blocks) {
  const parts = []
  let listBuffer = null

  const flushList = () => {
    if (!listBuffer) return
    const tag = listBuffer.ordered ? "ol" : "ul"
    parts.push(`<${tag}>${listBuffer.items.join("")}</${tag}>`)
    listBuffer = null
  }

  for (const b of blocks || []) {
    if (b.type === "list-item") {
      if (!listBuffer || listBuffer.ordered !== b.ordered) flushList()
      if (!listBuffer) listBuffer = { ordered: b.ordered, items: [] }
      listBuffer.items.push(`<li>${escapeHtml(b.text)}</li>`)
      continue
    }
    flushList()

    switch (b.type) {
      case "heading":
        parts.push(`<h${b.level || 2}>${escapeHtml(b.text)}</h${b.level || 2}>`)
        break
      case "paragraph":
      case "raw":
        parts.push(`<p>${escapeHtml(b.text)}</p>`)
        break
      case "blockquote":
        parts.push(`<blockquote>${escapeHtml(b.text)}</blockquote>`)
        break
      case "code":
        parts.push(`<pre><code>${escapeHtml(b.text)}</code></pre>`)
        break
      case "image":
        if (b.mediaId && b.file) {
          parts.push(`<img src="{{media:${b.mediaId}}}" alt="${escapeHtml(b.alt || "")}" />`)
        } else {
          parts.push(b.src ? `<img src="${escapeHtml(b.src)}" alt="${escapeHtml(b.alt || "")}" />` : "")
        }
        break
      case "gallery": {
        const cols = b.columns || 2
        const mode = b.mode || "truncated"
        const allImgs = (b.images || []).filter((img) => img.src)
        if (!allImgs.length) break
        const imgsData = allImgs.map((img) => ({ src: img.src, alt: img.alt || "" }))
        const imgsJson = JSON.stringify(imgsData)
        const visibleImgs = mode === "truncated" ? allImgs.slice(0, cols) : allImgs
        const inner = visibleImgs.map((img, i) => {
          const imgSrc = img.mediaId && img.file ? `{{media:${img.mediaId}}}` : escapeHtml(img.src)
          const isLast = mode === "truncated" && i === visibleImgs.length - 1 && allImgs.length > cols
          if (isLast) {
            const remaining = allImgs.length - cols
            return `<div class="gallery-more"><img src="${imgSrc}" alt="${escapeHtml(img.alt || "")}" style="filter:brightness(.6);" /><span>+${remaining}</span></div>`
          }
          return `<img src="${imgSrc}" alt="${escapeHtml(img.alt || "")}" />`
        }).join("\n")
        parts.push(`<div class="gallery-grid" data-mode="${mode}" data-images="${escapeHtml(imgsJson)}" style="grid-template-columns:repeat(${cols},1fr);">\n${inner}\n</div>`)
        break
      }
      case "video":
        if (b.mediaId && b.file) {
          parts.push(`<video src="{{media:${b.mediaId}}}" controls></video>`)
        } else {
          parts.push(b.url ? `<video src="${escapeHtml(b.url)}" controls></video>` : "")
        }
        break
      case "hr":
        parts.push("<hr />")
        break
      default:
        parts.push(`<p>${escapeHtml(b.text)}</p>`)
    }
  }

  flushList()
  return parts.join("\n")
}