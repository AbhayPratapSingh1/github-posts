import { FaComment } from "react-icons/fa"
import { Link } from "react-router-dom"
import Tooltip from "./Tooltip"

function FeedbackButton() {
  return (
    <Tooltip tip="feedback" side="left" className="fixed bottom-6 right-6 z-50">
      <Link
        to="/feedback"
        className="flex size-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-opacity hover:bg-primary-700"
        aria-label="Send feedback"
      >
        <FaComment className="text-sm" />
      </Link>
    </Tooltip>
  )
}

export default FeedbackButton
