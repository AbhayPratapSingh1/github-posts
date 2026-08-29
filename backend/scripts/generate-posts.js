import { writeFile, mkdir, access, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"
import * as posts from "../src/posts.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.join(__dirname, "..", "posts", "post.json")
const API = "https://api.github.com/repos"
const FORCE = process.argv.includes("--force")

const parseRepo = (github) => {
  const ssh = /git@github\.com:(.+?)\/(.+?)\.git/.exec(github ?? "")
  if (ssh) return `${ssh[1]}/${ssh[2]}`
  const https = /github\.com\/(.+?)\/(.+?)(?:\.git)?$/.exec(github ?? "")
  if (https) return `${https[1]}/${https[2]}`
  return null
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchRepoMeta = async (repo) => {
  const res = await fetch(`${API}/${repo}`)
  if (res.status === 404) {
    console.warn(`  ! ${repo}: not found, skipping`)
    return null
  }
  if (res.status === 403) {
    console.error(`  ! ${repo}: rate limited (${res.headers.get("x-ratelimit-remaining")} remaining)`)
    throw new Error("GitHub rate limit exceeded")
  }
  if (!res.ok) {
    console.warn(`  ! ${repo}: HTTP ${res.status}, skipping`)
    return null
  }
  return res.json()
}

const enrichPost = (seed, meta) => {
  if (!meta) return seed
  return {
    ...seed,
    ...(meta.description ? { description: `> ${meta.description}\n\n${seed.description}` } : {}),
    ...(meta.created_at ? { dateOfCreation: Math.floor(new Date(meta.created_at).getTime() / 1000) } : {}),
    ...(meta.language ? { language: meta.language } : {}),
    ...(meta.topics?.length ? { topics: meta.topics } : {}),
    ...(meta.stargazers_count ? { stars: meta.stargazers_count } : {}),
    ...(meta.forks_count ? { forks: meta.forks_count } : {}),
    ...(meta.pushed_at ? { lastPushAt: meta.pushed_at } : {}),
    ...(meta.default_branch ? { defaultBranch: meta.default_branch } : {}),
  }
}

const main = async () => {
  const seeds = Object.values(posts).filter(
    (post) => post && typeof post === "object" && post.id,
  )

  console.log(`Found ${seeds.length} seed posts`)

  let cached = []
  try {
    cached = JSON.parse(await readFile(OUTPUT, "utf-8"))
  } catch {
    // no cache yet
  }

  const results = []
  for (const seed of seeds) {
    const repo = parseRepo(seed.github)
    if (!repo) {
      console.log(`  - ${seed.id}: no github url, keeping seed`)
      results.push(seed)
      continue
    }
    const cachedPost = cached.find((p) => p.id === seed.id)
    if (cachedPost && !FORCE) {
      console.log(`  - ${seed.id} (${repo}): cached, skipping`)
      results.push(cachedPost)
      continue
    }
    console.log(`  - ${seed.id} (${repo}): fetching`)
    const meta = await fetchRepoMeta(repo)
    results.push(enrichPost(seed, meta))
    if (meta) await sleep(1000)
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(results, null, 2))
  console.log(`\nWrote ${results.length} posts to ${OUTPUT}`)

  const timestamps = results
    .filter((p) => p.dateOfCreation)
    .map((p) => p.dateOfCreation)
  if (timestamps.length) {
    const newest = new Date(Math.max(...timestamps) * 1000).toISOString()
    const oldest = new Date(Math.min(...timestamps) * 1000).toISOString()
    console.log(`Oldest repo: ${oldest} | Newest repo: ${newest}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})