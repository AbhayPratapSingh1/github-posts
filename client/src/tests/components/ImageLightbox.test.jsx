import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import ImageLightbox from "../../components/ImageLightbox.jsx"

const images = [
  "https://example.com/img1.png",
  "https://example.com/img2.png",
  "https://example.com/img3.png",
]

describe("ImageLightbox", () => {
  beforeEach(() => {
    document.body.style.overflow = ""
  })

  afterEach(() => {
    document.body.style.overflow = ""
  })

  it("renders nothing when images array is empty", () => {
    const { container } = render(
      <ImageLightbox images={[]} startIndex={0} onClose={() => {}} />
    )
    expect(container.innerHTML).toBe("")
  })

  it("renders the current image", () => {
    render(<ImageLightbox images={images} startIndex={0} onClose={() => {}} />)
    const img = document.querySelector("img")
    expect(img).toBeTruthy()
    expect(img.getAttribute("src")).toBe(images[0])
  })

  it("shows counter for multiple images", () => {
    render(<ImageLightbox images={images} startIndex={0} onClose={() => {}} />)
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
  })

  it("does not show counter for single image", () => {
    render(<ImageLightbox images={[images[0]]} startIndex={0} onClose={() => {}} />)
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument()
  })

  it("shows prev/next buttons for multiple images", () => {
    render(<ImageLightbox images={images} startIndex={0} onClose={() => {}} />)
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={images} startIndex={0} onClose={onClose} />)
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[0])
    expect(onClose).toHaveBeenCalled()
  })

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={images} startIndex={0} onClose={onClose} />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })

  it("navigates to next image on ArrowRight", () => {
    render(<ImageLightbox images={images} startIndex={0} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: "ArrowRight" })
    expect(screen.getByText("2 / 3")).toBeInTheDocument()
  })

  it("navigates to prev image on ArrowLeft", () => {
    render(<ImageLightbox images={images} startIndex={1} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: "ArrowLeft" })
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
  })

  it("wraps around from last to first", () => {
    render(<ImageLightbox images={images} startIndex={2} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: "ArrowRight" })
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
  })

  it("wraps around from first to last", () => {
    render(<ImageLightbox images={images} startIndex={0} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: "ArrowLeft" })
    expect(screen.getByText("3 / 3")).toBeInTheDocument()
  })
})
