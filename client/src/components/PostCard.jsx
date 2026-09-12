import { Link } from "react-router-dom"
import { FaPlay, FaGithub } from "react-icons/fa"
import LikeButton from "./LikeButton"

const primaryLabel = (type) => {
  if (type === "playable") return <><FaPlay /> Playable</>
  if (type === "hosted") return "Hosted"
  return null
}

function PostCard({ post, onLikeChange }) {
  const label = primaryLabel(post.type)
  return (
    <Link
      key={post.id}
      to={`/post/${post.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-bg-200 bg-bg-100 p-5 transition-colors hover:border-primary-400 dark:border-bg-800 dark:bg-bg-900 dark:hover:border-primary-600 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold group-hover:text-primary-600 dark:group-hover:text-primary-400">
            {post.title}
          </h2>
          {label && (
            <span className="flex items-center gap-1.5 rounded-full bg-primary-600/10 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:text-primary-400">
              {label}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-fg-600 dark:text-fg-400">
          {post.shortDescription}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-fg-500 dark:text-fg-400">
          {post.githubOwner && (
            <span>
              by{" "}
              <span
                onClick={() => window.open(`https://github.com/${post.githubOwner}`, "_blank")}
                className="font-medium text-primary-600 hover:underline dark:text-primary-400 cursor-pointer"
              >
                {post.authorName || post.authorUsername || post.githubOwner}
              </span>
            </span>
          )}
          {post.created_at && (
            <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 text-sm text-fg-500 dark:text-fg-400">
        {post.hosted?.url && (
          <span className="hidden items-center gap-1.5 sm:flex">
            <FaPlay className="text-xs" />
            {post.hosted.plateForm}
          </span>
        )}
        {post.github && (
          <FaGithub className="text-base" />
        )}
        <LikeButton
          postId={post.id}
          liked={post.liked}
          likeCount={post.likeCount}
          onStateChange={(state) => onLikeChange(post, state)}
        />
      </div>
    </Link>
  )
}

export default PostCard