# Application Flows

This document describes end-to-end application flows, showing how data moves through the system.

## Authentication Flows

### GitHub OAuth Login

**Trigger:** User clicks "Sign in with GitHub" on Login page
**Entry point:** `client/src/pages/Login.jsx`
**Frontend:** Login page → OAuth redirect
**API:** GET `/api/auth/github` → GitHub OAuth → GET `/api/auth/github/callback`
**Backend:** OAuth code exchange → User upsert → Token creation
**Database:** User create/update
**External services:** GitHub OAuth API, GitHub User API
**State changes:** Auth state updated, tokens stored
**Caching:** None
**Authorization:** None
**Errors:** OAuth failures redirect with error message
**Loading states:** Button shows loading spinner
**Success state:** Redirect to home page with user authenticated
**Important files:**
- `client/src/pages/Login.jsx`
- `client/src/context/AuthContext.jsx`
- `backend-fastapi/main.py:206-315`

**Technical execution sequence:**
```
User clicks "Sign in with GitHub"
  ↓
window.location = `${API_BASE}/auth/github`
  ↓
Backend: github_login()
  ↓
Backend: Redirect to GitHub OAuth URL
  ↓
GitHub: User authorizes
  ↓
GitHub: Redirect to callback URL
  ↓
Backend: github_callback()
  ↓
Backend: Exchange code for access token
  ↓
Backend: Fetch user profile from GitHub API
  ↓
Backend: Database upsert User
  ↓
Backend: create_access_token()
  ↓
Backend: create_refresh_token()
  ↓
Backend: set_session_cookie()
  ↓
Backend: set_refresh_cookie()
  ↓
Backend: Redirect to FRONTEND_URL?token=...&refresh=...&user=...
  ↓
Frontend: AuthContext useEffect
  ↓
Frontend: Parse tokens from URL
  ↓
Frontend: localStorage.setItem("session_token", token)
  ↓
Frontend: localStorage.setItem("refresh_token", refresh)
  ↓
Frontend: setUser(userData)
  ↓
Frontend: window.history.replaceState() (clear URL)
  ↓
Frontend: addToast("Signed in as ...")
```

### Admin Login

**Trigger:** User submits admin credentials
**Entry point:** `client/src/pages/AdminLogin.jsx`
**Frontend:** Admin login form → API call
**API:** POST `/api/admin/login`
**Backend:** Credential verification → Token creation
**Database:** User lookup
**External services:** None
**State changes:** Auth state updated, admin token stored
**Caching:** None
**Authorization:** Admin only (GitHub ID + password)
**Errors:** Invalid credentials, not admin
**Loading states:** Button shows loading spinner
**Success state:** Redirect to admin dashboard
**Important files:**
- `client/src/pages/AdminLogin.jsx`
- `client/src/context/AuthContext.jsx`
- `backend-fastapi/main.py:349-382`

**Technical execution sequence:**
```
User enters GitHub ID and password
  ↓
Frontend: POST /api/admin/login
  ↓
Backend: admin_login()
  ↓
Backend: Verify password == ADMIN_PASSWORD
  ↓
Backend: Verify github_id in ADMIN_GITHUB_IDS
  ↓
Backend: Database lookup User
  ↓
Backend: create_access_token()
  ↓
Backend: create_refresh_token()
  ↓
Backend: set_session_cookie()
  ↓
Backend: set_refresh_cookie()
  ↓
Backend: Return user data and token
  ↓
Frontend: AuthContext.login()
  ↓
Frontend: setUser(data.user)
  ↓
Frontend: localStorage.setItem("admin_token", token)
  ↓
Frontend: Redirect to /admin/dashboard
```

### Session Restoration

**Trigger:** Frontend application mount
**Entry point:** `client/src/context/AuthContext.jsx`
**Frontend:** AuthContext useEffect
**API:** GET `/api/auth/me`
**Backend:** Token validation → User lookup
**Database:** User query
**External services:** None
**State changes:** Auth state updated or cleared
**Caching:** None
**Authorization:** Optional (validates if token present)
**Errors:** Clears auth on any error
**Loading states:** Shows loading spinner during check
**Success state:** User state populated or null
**Important files:**
- `client/src/context/AuthContext.jsx`

**Technical execution sequence:**
```
Frontend mounts
  ↓
AuthContext useEffect runs
  ↓
Check URL for OAuth tokens
  ↓
If tokens present:
  Parse and store tokens
  Clear URL parameters
  Set user state
  ↓
Else:
  checkAuth()
  ↓
  GET /api/auth/me
  ↓
  Backend: get_me()
  ↓
  Backend: get_user_from_request()
  ↓
  Backend: decode_token()
  ↓
  Backend: Database lookup User
  ↓
  Return user data
  ↓
  Frontend: setUser(data.user)
```

## Content Flows

### Create Post

**Trigger:** User submits create post form
**Entry point:** `client/src/pages/CreatePost.jsx`
**Frontend:** Form validation → API call
**API:** POST `/api/posts`
**Backend:** Validation → GitHub enrichment → Database insert
**Database:** Post create
**External services:** GitHub API (optional)
**State changes:** New post created
**Caching:** None
**Authorization:** Required (ownership set)
**Errors:** Duplicate title (409), repo not owned (403)
**Loading states:** Submit button shows loading
**Success state:** Redirect to new post page
**Important files:**
- `client/src/pages/CreatePost.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:842-885`

**Technical execution sequence:**
```
User fills form and submits
  ↓
Frontend: Validate form fields
  ↓
Frontend: createPost(data)
  ↓
Frontend: POST /api/posts
  ↓
Backend: createPost()
  ↓
Backend: require_user() (verify authentication)
  ↓
Backend: slugify(title) → generate post ID
  ↓
Backend: Check for duplicate ID
  ↓
Backend: If github URL provided:
  parse_github_url()
  fetch_github_repo()
  Verify repo ownership
  Enrich with GitHub data
  ↓
Backend: postHandler.create_post()
  ↓
Backend: Database insert
  ↓
Backend: Return created post
  ↓
Frontend: Redirect to /post/{id}
```

### Edit Post

**Trigger:** User submits edit post form
**Entry point:** `client/src/pages/CreatePost.jsx` (edit mode)
**Frontend:** Form pre-fill → API call
**API:** PUT `/api/posts/{id}`
**Backend:** Ownership verification → GitHub enrichment → Database update
**Database:** Post update
**External services:** GitHub API (optional)
**State changes:** Post updated
**Caching:** None
**Authorization:** Required (ownership verified)
**Errors:** Post not found (404), not owner (403)
**Loading states:** Submit button shows loading
**Success state:** Redirect to updated post page
**Important files:**
- `client/src/pages/CreatePost.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:906-948`

**Technical execution sequence:**
```
User edits form and submits
  ↓
Frontend: Validate form fields
  ↓
Frontend: updatePost(id, data)
  ↓
Frontend: PUT /api/posts/{id}
  ↓
Backend: updatePost()
  ↓
Backend: require_user() (verify authentication)
  ↓
Backend: postHandler.get_post_raw() (get existing post)
  ↓
Backend: Verify post.user_id == user.id
  ↓
Backend: If github URL provided:
  parse_github_url()
  fetch_github_repo()
  Verify repo ownership
  Enrich with GitHub data
  ↓
Backend: postHandler.update_post()
  ↓
Backend: Database update
  ↓
Backend: Return updated post
  ↓
Frontend: Redirect to /post/{id}
```

### Single Post Rendering

**Trigger:** User navigates to post page
**Entry point:** `client/src/pages/Post.jsx`
**Frontend:** Route match → API call
**API:** GET `/api/posts/{id}`
**Backend:** Post lookup → Comment fetch
**Database:** Post query, Comment join query
**External services:** None
**State changes:** Post state populated
**Caching:** None
**Authorization:** None (public)
**Errors:** Post not found (404)
**Loading states:** Shows loading skeleton
**Success state:** Post rendered with comments
**Important files:**
- `client/src/pages/Post.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:614-658`

**Technical execution sequence:**
```
User navigates to /post/{id}
  ↓
React Router: Match route
  ↓
Post component mounts
  ↓
useEffect: getPostById(id)
  ↓
Frontend: GET /api/posts/{id}
  ↓
Backend: getPostById()
  ↓
Backend: postHandler.get_post_by_id()
  ↓
Backend: postHandler._resolve_user()
  ↓
Backend: Database query Post
  ↓
Backend: Database query Comments (limit 6)
  ↓
Backend: Join Comment with User
  ↓
Backend: Return post with comments
  ↓
Frontend: setPost(data)
  ↓
Frontend: Render post details
  ↓
Frontend: Render comments section
```

### Post List / Home Page

**Trigger:** User navigates to home page
**Entry point:** `client/src/pages/Home.jsx`
**Frontend:** Component mount → API call
**API:** GET `/api/posts?offset=0&limit=12`
**Backend:** Paginated query
**Database:** Post query with offset/limit
**External services:** None
**State changes:** Posts array populated
**Caching:** None
**Authorization:** None (public)
**Errors:** Falls back to static posts on DB error
**Loading states:** Shows loading skeleton, then posts
**Success state:** Posts rendered in grid
**Important files:**
- `client/src/pages/Home.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:604-612`

**Technical execution sequence:**
```
User navigates to /
  ↓
React Router: Match route
  ↓
Home component mounts
  ↓
useEffect: getPosts(offset, limit)
  ↓
Frontend: GET /api/posts?offset=0&limit=12
  ↓
Backend: getPosts()
  ↓
Backend: postHandler.get_all_posts()
  ↓
Backend: Database count total
  ↓
Backend: Database query with offset/limit
  ↓
Backend: For each post: _resolve_user()
  ↓
Backend: Return posts, total, offset, limit
  ↓
Frontend: setPosts(data.posts)
  ↓
Frontend: Render post grid
  ↓
Infinite scroll: IntersectionObserver triggers next page
```

### Delete Post

**Trigger:** User clicks delete button
**Entry point:** `client/src/pages/Post.jsx`
**Frontend:** Confirmation modal → API call
**API:** DELETE `/api/posts/{id}`
**Backend:** Ownership verification → Database delete
**Database:** Post delete
**External services:** None
**State changes:** Post deleted
**Caching:** None
**Authorization:** Required (ownership verified)
**Errors:** Post not found (404), not owner (403)
**Loading states:** Button shows loading
**Success state:** Redirect to home page
**Important files:**
- `client/src/pages/Post.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:887-904`

**Technical execution sequence:**
```
User clicks delete button
  ↓
Frontend: Show confirmation modal
  ↓
User confirms deletion
  ↓
Frontend: deletePost(id)
  ↓
Frontend: DELETE /api/posts/{id}
  ↓
Backend: deletePost()
  ↓
Backend: require_user() (verify authentication)
  ↓
Backend: postHandler.get_post_raw()
  ↓
Backend: Verify post.user_id == user.id
  ↓
Backend: postHandler.delete_post()
  ↓
Backend: Database delete
  ↓
Backend: Return success message
  ↓
Frontend: addToast("Post deleted")
  ↓
Frontend: Navigate to /
```

## Comment Flows

### Create Comment

**Trigger:** User submits comment form
**Entry point:** `client/src/components/Comments.jsx`
**Frontend:** Form submission → API call
**API:** POST `/api/posts/{post_id}/comments`
**Backend:** Validation → Database insert
**Database:** Comment create
**External services:** None
**State changes:** New comment created
**Caching:** None
**Authorization:** Required (any authenticated user)
**Errors:** Empty content (400), not authenticated (401)
**Loading states:** Submit button shows loading
**Success state:** Comment appears in list
**Important files:**
- `client/src/components/Comments.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:480-529`

**Technical execution sequence:**
```
User types comment and submits
  ↓
Frontend: Validate content not empty
  ↓
Frontend: POST /api/posts/{post_id}/comments
  ↓
Backend: create_comment()
  ↓
Backend: require_user() (verify authentication)
  ↓
Backend: Validate content not empty
  ↓
Backend: Create Comment object
  ↓
Backend: Database insert
  ↓
Backend: Return created comment
  ↓
Frontend: Add comment to list
  ↓
Frontend: Clear form
```

### Load Comments

**Trigger:** Post page loads or "See all comments" clicked
**Entry point:** `client/src/pages/Post.jsx` or `client/src/components/Comments.jsx`
**Frontend:** Component mount → API call
**API:** GET `/api/posts/{post_id}/comments`
**Backend:** Comment query with user join
**Database:** Comment join query
**External services:** None
**State changes:** Comments array populated
**Caching:** None
**Authorization:** None (public)
**Errors:** None
**Loading states:** Shows loading skeleton
**Success state:** Comments rendered
**Important files:**
- `client/src/pages/Post.jsx`
- `client/src/components/Comments.jsx`
- `backend-fastapi/main.py:532-562`

**Technical execution sequence:**
```
Component mounts
  ↓
useEffect: getPostCommentById(post_id)
  ↓
Frontend: GET /api/posts/{post_id}/comments
  ↓
Backend: get_comments()
  ↓
Backend: Database query Comments
  ↓
Backend: Join with User table
  ↓
Backend: Order by created_at DESC
  ↓
Backend: Limit to 6
  ↓
Backend: Return comments with user data
  ↓
Frontend: setComments(data)
  ↓
Frontend: Render comments list
```

## GitHub Integration Flows

### Fetch GitHub Info

**Trigger:** User enters GitHub URL in create/edit form
**Entry point:** `client/src/pages/CreatePost.jsx`
**Frontend:** Debounced input → API call
**API:** GET `/api/github/info?url=...`
**Backend:** URL parsing → GitHub API call → Caching
**Database:** None
**External services:** GitHub API
**State changes:** Form fields populated
**Caching:** In-memory cache (1 hour TTL)
**Authorization:** None (but uses token if available)
**Errors:** Invalid URL (400), repo not found (404)
**Loading states:** Shows loading indicator
**Success state:** Form fields auto-filled
**Important files:**
- `client/src/pages/CreatePost.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:660-690`

**Technical execution sequence:**
```
User types GitHub URL
  ↓
Frontend: Debounce (500ms)
  ↓
Frontend: getGithubInfo(url)
  ↓
Frontend: GET /api/github/info?url=...
  ↓
Backend: getGithubInfo()
  ↓
Backend: parse_github_url()
  ↓
Backend: Check _github_cache
  ↓
If cached and fresh:
  Return cached data
Else:
  fetch_github_repo()
  ↓
  Backend: httpx GET GitHub API
  ↓
  Backend: Store in _github_cache
  ↓
  Return repository data
  ↓
Frontend: Populate form fields
  ↓
Frontend: language, defaultBranch, stats, etc.
```

### Generate Post Content with AI

**Trigger:** User clicks "Generate with AI" button
**Entry point:** `client/src/pages/CreatePost.jsx`
**Frontend:** Button click → API call
**API:** POST `/api/github/generate?url=...`
**Backend:** GitHub data fetch → README fetch → Gemini API call
**Database:** None
**External services:** GitHub API, Google Gemini API
**State changes:** Form fields populated with generated content
**Caching:** GitHub cache used
**Authorization:** None (but uses token if available)
**Errors:** Invalid URL (400), repo not found (404), generation failed (500)
**Loading states:** Shows "Generating..." indicator
**Success state:** Form fields auto-filled with AI content
**Important files:**
- `client/src/pages/CreatePost.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:706-840`

**Technical execution sequence:**
```
User clicks "Generate with AI"
  ↓
Frontend: generatePostContent(url)
  ↓
Frontend: POST /api/github/generate?url=...
  ↓
Backend: generatePostContent()
  ↓
Backend: parse_github_url()
  ↓
Backend: Check GEMINI_API_KEY configured
  ↓
Backend: fetch_github_repo()
  ↓
Backend: fetch_readme()
  ↓
Backend: generate_with_gemini()
  ↓
Backend: Build prompt with repo data + README
  ↓
Backend: httpx POST to Gemini API
  ↓
Backend: Parse response JSON
  ↓
Backend: fix_json_strings() (sanitize LLM output)
  ↓
Backend: markdown.markdown() (convert to HTML)
  ↓
Backend: Return generated content
  ↓
Frontend: Populate form fields
  ↓
Frontend: title, shortDescription, description, type, availableAt
```

## Admin Flows

### Admin Dashboard

**Trigger:** Admin navigates to dashboard
**Entry point:** `client/src/pages/AdminDashboard.jsx`
**Frontend:** Component mount → API call
**API:** GET `/api/admin/dashboard`
**Backend:** Admin verification → Aggregation queries
**Database:** Post query, User query
**External services:** None
**State changes:** Dashboard data populated
**Caching:** None
**Authorization:** Required (admin only)
**Errors:** Not admin (403)
**Loading states:** Shows loading skeleton
**Success state:** Dashboard rendered with stats
**Important files:**
- `client/src/pages/AdminDashboard.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:384-445`

**Technical execution sequence:**
```
Admin navigates to /admin/dashboard
  ↓
Frontend: Check admin_token in localStorage
  ↓
Frontend: GET /api/admin/dashboard
  ↓
Backend: admin_dashboard()
  ↓
Backend: get_user_from_request()
  ↓
Backend: Verify github_id in ADMIN_GITHUB_IDS
  ↓
Backend: Database query all Posts
  ↓
Backend: Database query all Users
  ↓
Backend: Calculate stats (totalPosts, totalUsers, totalStars, totalForks)
  ↓
Backend: Aggregate languages
  ↓
Backend: Return stats, posts, users
  ↓
Frontend: setStats(data.stats)
  ↓
Frontend: setPosts(data.posts)
  ↓
Frontend: setUsers(data.users)
  ↓
Frontend: Render dashboard
```

### Admin Delete Post

**Trigger:** Admin clicks delete button on post
**Entry point:** `client/src/pages/AdminDashboard.jsx`
**Frontend:** Confirmation modal → API call
**API:** DELETE `/api/admin/posts/{id}`
**Backend:** Admin verification → Database delete
**Database:** Post delete
**External services:** None
**State changes:** Post deleted
**Caching:** None
**Authorization:** Required (admin only)
**Errors:** Not admin (403), post not found (404)
**Loading states:** Button shows loading
**Success state:** Post removed from list
**Important files:**
- `client/src/pages/AdminDashboard.jsx`
- `client/src/api/posts.js`
- `backend-fastapi/main.py:447-457`

**Technical execution sequence:**
```
Admin clicks delete button
  ↓
Frontend: Show confirmation modal
  ↓
Admin confirms deletion
  ↓
Frontend: deletePost(id)
  ↓
Frontend: DELETE /api/admin/posts/{id}
  ↓
Backend: admin_delete_post()
  ↓
Backend: get_user_from_request()
  ↓
Backend: Verify github_id in ADMIN_GITHUB_IDS
  ↓
Backend: postHandler.get_post_raw()
  ↓
Backend: postHandler.delete_post()
  ↓
Backend: Database delete
  ↓
Backend: Return success message
  ↓
Frontend: Remove post from list
  ↓
Frontend: addToast("Post deleted")
```

## Error Handling Flows

### API Error Handling

**Trigger:** API request fails
**Entry point:** `client/src/api/client.js`
**Frontend:** Error catch → Toast notification
**API:** Any endpoint
**Backend:** Error response
**Database:** N/A
**External services:** N/A
**State changes:** Error state updated
**Caching:** None
**Authorization:** N/A
**Errors:** Various HTTP status codes
**Loading states:** Loading states cleared
**Success state:** N/A
**Important files:**
- `client/src/api/client.js`
- `client/src/context/ToastContext.jsx`

**Technical execution sequence:**
```
API request fails
  ↓
Frontend: request() catches error
  ↓
Frontend: Check status code
  ↓
If 401:
  Attempt token refresh
  Retry request once
  If still fails:
    Throw error
Else:
  Throw error
  ↓
Component catches error
  ↓
Component: addToast(error.message, "error")
  ↓
ToastContext: Show error toast
  ↓
Toast auto-dismisses after duration
```

### Database Fallback

**Trigger:** Database connection fails
**Entry point:** `backend-fastapi/main.py`
**Backend:** Exception catch → Fallback data
**API:** GET `/api/posts` or GET `/api/posts/{id}`
**Database:** Connection failure
**External services:** None
**State changes:** None
**Caching:** None
**Authorization:** None
**Errors:** Database operational error
**Loading states:** N/A
**Success state:** Returns static fallback data
**Important files:**
- `backend-fastapi/main.py:604-624`
- `backend-fastapi/all_posts.py`

**Technical execution sequence:**
```
Database query fails
  ↓
Backend: Exception caught
  ↓
Backend: Return static posts from all_posts.py
  ↓
Frontend: Receives fallback data
  ↓
Frontend: Renders posts normally
```

## Infinite Scroll Flow

**Trigger:** User scrolls to bottom of post list
**Entry point:** `client/src/pages/Home.jsx`
**Frontend:** IntersectionObserver triggers → API call
**API:** GET `/api/posts?offset={offset}&limit=12`
**Backend:** Paginated query
**Database:** Post query with offset/limit
**External services:** None
**State changes:** More posts appended to list
**Caching:** None
**Authorization:** None (public)
**Errors:** None (stops loading on error)
**Loading states:** Shows loading indicator at bottom
**Success state:** More posts loaded
**Important files:**
- `client/src/pages/Home.jsx`

**Technical execution sequence:**
```
User scrolls to bottom
  ↓
IntersectionObserver triggers callback
  ↓
Frontend: Increment offset
  ↓
Frontend: getPosts(offset, limit)
  ↓
Frontend: GET /api/posts?offset={offset}&limit=12
  ↓
Backend: Paginated query
  ↓
Backend: Return new posts
  ↓
Frontend: Append to posts array
  ↓
Frontend: Render new posts
  ↓
Repeat until no more posts
```