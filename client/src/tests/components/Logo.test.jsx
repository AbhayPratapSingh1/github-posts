import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import Logo from "../../components/Logo.jsx"

describe("Logo", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<Logo className="size-10" />)
    const svg = container.querySelector("svg")
    expect(svg).toHaveClass("size-10")
  })

  it("has default empty className", () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("has viewBox attribute", () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("viewBox", "0 0 36 36")
  })
})
