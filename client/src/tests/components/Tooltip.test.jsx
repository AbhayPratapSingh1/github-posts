import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Tooltip from "../../components/Tooltip.jsx"
import { TOOLTIPS } from "../../config/tooltips.js"

describe("Tooltip", () => {
  it("renders children", () => {
    render(
      <Tooltip tip="like">
        <button>Heart</button>
      </Tooltip>
    )
    expect(screen.getByText("Heart")).toBeInTheDocument()
  })

  it("uses the tooltip description from the config", () => {
    render(
      <Tooltip tip="like">
        <button>Heart</button>
      </Tooltip>
    )
    expect(screen.getByRole("tooltip")).toHaveTextContent(TOOLTIPS.like)
  })

  it("renders the bubble inside the tooltip container", () => {
    render(
      <Tooltip tip="newPost">
        <button>New Post</button>
      </Tooltip>
    )
    const bubble = screen.getByRole("tooltip")
    expect(bubble.closest(".tooltip-container")).not.toBeNull()
    expect(bubble).toHaveClass("tooltip-bubble")
  })

  it("prefers the explicit text over the config key", () => {
    render(
      <Tooltip tip="like" text="Custom label">
        <button>Heart</button>
      </Tooltip>
    )
    expect(screen.getByRole("tooltip")).toHaveTextContent("Custom label")
  })

  it("renders children unchanged when no label is provided", () => {
    const { container } = render(
      <Tooltip>
        <button>Plain</button>
      </Tooltip>
    )
    expect(container.querySelector(".tooltip-container")).toBeNull()
    expect(screen.getByText("Plain")).toBeInTheDocument()
  })

  it("allows positional className for fixed/absolute placements", () => {
    render(
      <Tooltip tip="goToTop" className="fixed bottom-6 right-6">
        <button>Top</button>
      </Tooltip>
    )
    expect(screen.getByRole("tooltip").closest(".tooltip-container")).toHaveClass("fixed")
    expect(screen.getByRole("tooltip").closest(".tooltip-container")).toHaveStyle({ position: "fixed" })
  })
})