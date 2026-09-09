import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import Modal from "../../components/Modal.jsx"

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    )
    expect(container.innerHTML).toBe("")
  })

  it("renders children when open", () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText("Modal content")).toBeInTheDocument()
  })

  it("renders close button", () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    )
    expect(screen.getByLabelText("Close")).toBeInTheDocument()
  })

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    fireEvent.click(screen.getByLabelText("Close"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose on other keys", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    fireEvent.keyDown(window, { key: "Enter" })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("does not close when clicking inside the modal content", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    fireEvent.click(screen.getByText("Content"))
    expect(onClose).not.toHaveBeenCalled()
  })
})
