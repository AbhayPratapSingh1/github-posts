import { describe, it, expect } from "vitest"
import { parseHtmlToBlocks, blocksToMarkdown, blocksToHtml } from "../../config/editorBlocks.js"

describe("parseHtmlToBlocks", () => {
  const html = `
    <p>Intro paragraph.</p>
    <h2>Gameplay</h2>
    <ul>
      <li>First bullet</li>
      <li>Second bullet</li>
    </ul>
    <h3>Tech Stack</h3>
    <ol>
      <li>React</li>
      <li>Vite</li>
    </ol>
    <blockquote>Nice quote</blockquote>
  `

  it("splits tags into separate editable blocks", () => {
    const blocks = parseHtmlToBlocks(html)
    const types = blocks.map((b) => b.type)
    expect(types).toEqual([
      "paragraph",
      "heading",
      "list-item",
      "list-item",
      "heading",
      "list-item",
      "list-item",
      "blockquote",
    ])
  })

  it("keeps heading levels and text", () => {
    const headers = parseHtmlToBlocks(html).filter((b) => b.type === "heading")
    expect(headers[0]).toMatchObject({ level: 2, text: "Gameplay" })
    expect(headers[1]).toMatchObject({ level: 3, text: "Tech Stack" })
  })

  it("keeps the ordered flag on list items", () => {
    const blocks = parseHtmlToBlocks(html)
    expect(blocks[2]).toMatchObject({ type: "list-item", ordered: false, text: "First bullet" })
    expect(blocks[5]).toMatchObject({ type: "list-item", ordered: true, text: "React" })
  })

  it("handles image and video blocks", () => {
    const blocks = parseHtmlToBlocks('<img src="https://a.png" alt="shot" /><video src="https://v.mp4"></video>')
    expect(blocks[0]).toMatchObject({ type: "image", src: "https://a.png", alt: "shot" })
    expect(blocks[1]).toMatchObject({ type: "video", url: "https://v.mp4" })
  })

  it("returns an empty array for falsy input", () => {
    expect(parseHtmlToBlocks("")).toEqual([])
    expect(parseHtmlToBlocks(null)).toEqual([])
  })
})

describe("blocksToMarkdown", () => {
  it("renders headings with correct number of #", () => {
    const md = blocksToMarkdown([
      { type: "heading", level: 1, text: "Title" },
      { type: "heading", level: 3, text: "Sub" },
      { type: "paragraph", text: "Body copy" },
    ])
    expect(md).toBe("# Title\n\n### Sub\n\nBody copy")
  })

  it("renders lists, quotes, code and hr", () => {
    const md = blocksToMarkdown([
      { type: "list-item", ordered: false, text: "A" },
      { type: "blockquote", text: "quote" },
      { type: "code", text: "const x = 1" },
      { type: "hr" },
    ])
    expect(md).toContain("- A")
    expect(md).toContain("> quote")
    expect(md).toContain("```\nconst x = 1\n```")
    expect(md).toContain("---")
  })

  it("renders empty markdown for no blocks", () => {
    expect(blocksToMarkdown([])).toBe("")
  })
})

describe("blocksToHtml", () => {
  it("groups consecutive list items into a single list", () => {
    const html = blocksToHtml([
      { type: "list-item", ordered: false, text: "A" },
      { type: "list-item", ordered: false, text: "B" },
      { type: "paragraph", text: "After" },
    ])
    expect(html).toBe("<ul><li>A</li><li>B</li></ul>\n<p>After</p>")
  })

  it("separates ordered and unordered runs", () => {
    const html = blocksToHtml([
      { type: "list-item", ordered: true, text: "1" },
      { type: "list-item", ordered: false, text: "bullet" },
    ])
    expect(html).toBe("<ol><li>1</li></ol>\n<ul><li>bullet</li></ul>")
  })

  it("escapes html in block text", () => {
    const html = blocksToHtml([{ type: "paragraph", text: "<script>alert(1)</script>" }])
    expect(html).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>")
  })

  it("renders headings and media", () => {
    const html = blocksToHtml([
      { type: "heading", level: 2, text: "Gameplay" },
      { type: "image", src: "https://a.png", alt: "shot" },
      { type: "video", url: "https://v.mp4" },
    ])
    expect(html).toContain('<h2>Gameplay</h2>')
    expect(html).toContain('<img src="https://a.png" alt="shot" />')
    expect(html).toContain('<video src="https://v.mp4" controls></video>')
  })
})