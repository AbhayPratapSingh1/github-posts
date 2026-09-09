import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ToastProvider, useToast } from "../../context/ToastContext.jsx"

function TestComponent() {
  const { addToast } = useToast()
  return (
    <div>
      <button onClick={() => addToast("Test message", "success")}>Show Success</button>
      <button onClick={() => addToast("Error occurred", "error")}>Show Error</button>
      <button onClick={() => addToast("Info message", "info")}>Show Info</button>
    </div>
  )
}

describe("ToastContext", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows toast when addToast called", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Success"))
    expect(screen.getByText("Test message")).toBeInTheDocument()
  })

  it("shows error toast with correct styling", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Error"))
    const toast = screen.getByText("Error occurred")
    expect(toast).toBeInTheDocument()
    expect(toast.className).toContain("red")
  })

  it("shows success toast with correct styling", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Success"))
    const toast = screen.getByText("Test message")
    expect(toast.className).toContain("emerald")
  })

  it("removes toast on click", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Success"))
    expect(screen.getByText("Test message")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Test message"))
    expect(screen.queryByText("Test message")).not.toBeInTheDocument()
  })

  it("auto-removes toast after duration", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Success"))
    expect(screen.getByText("Test message")).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText("Test message")).not.toBeInTheDocument()
  })

  it("renders nothing when no toasts", () => {
    const { container } = render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>
    )
    expect(screen.getByText("App")).toBeInTheDocument()
  })
})
