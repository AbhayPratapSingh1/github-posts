import { FaComment } from "react-icons/fa"
import { Link } from "react-router-dom"

function FeedbackButton() {
  return (
    <Link
      to="/feedback"
      className="fixed bottom-6 right-20 z-50 flex size-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-opacity hover:bg-primary-700"
      aria-label="Send feedback"
    >
      <FaComment className="text-sm" />
    </Link>
  )
}

export default FeedbackButton
