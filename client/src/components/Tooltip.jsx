import { TOOLTIPS } from "../config/tooltips"

function Tooltip({ tip, text, side = "top", className = "", children }) {
  const label = text || (tip ? TOOLTIPS[tip] : null)
  if (!label) return children

  const fixed = className.includes("fixed")
  const absolute = className.includes("absolute")
  const position = fixed ? "fixed" : absolute ? "absolute" : undefined

  return (
    <span
      className={`tooltip-container ${className}`}
      style={position ? { position } : undefined}
      data-side={side}
    >
      {children}
      <span className="tooltip-bubble" role="tooltip">{label}</span>
    </span>
  )
}

export default Tooltip