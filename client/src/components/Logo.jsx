export default function Logo({ className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      fill="none"
      className={className}
    >
      <rect width="36" height="36" rx="8" fill="#6366F1" />
      <path
        d="M10 12h16M10 18h12M10 24h8"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="28" cy="24" r="2.5" fill="#22D3EE" />
    </svg>
  )
}
