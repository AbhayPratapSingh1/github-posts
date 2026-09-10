# Functions

This document catalogs important functions, methods, classes, hooks, and business logic in the Post Panel application.

## Backend Functions

### Authentication Functions

#### create_access_token()
- **File:** `backend-fastapi/auth.py:12`
- **Purpose:** Creates a JWT access token for authentication
- **Parameters:** `user_id: int`, `username: str`
- **Returns:** Encoded JWT string
- **Side effects:** None
- **Dependencies:** PyJWT, config.py (JWT_SECRET, JWT_ALGORITHM, JWT_ACCESS_EXPIRY_MINUTES)
- **Called by:** login routes, refresh functions
- **Error behavior:** Raises PyJWT errors on encoding failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** After successful login, token refresh

#### create_refresh_token()
- **File:** `backend-fastapi/auth.py:22`
- **Purpose:** Creates a JWT refresh token for token renewal
- **Parameters:** `user_id: int`, `username: str`
- **Returns:** Encoded JWT string
- **Side effects:** None
- **Dependencies:** PyJWT, config.py (JWT_SECRET, JWT_ALGORITHM, JWT_REFRESH_EXPIRY_DAYS)
- **Called by:** login routes, refresh functions
- **Error behavior:** Raises PyJWT errors on encoding failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** After successful login, token refresh

#### decode_token()
- **File:** `backend-fastapi/auth.py:32`
- **Purpose:** Decodes and validates a JWT token
- **Parameters:** `token: str`
- **Returns:** Decoded payload dict or None
- **Side effects:** None
- **Dependencies:** PyJWT
- **Called by:** get_user_from_request, refresh_access_token
- **Error behavior:** Returns None on any PyJWT error
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Token validation in authentication flow

#### get_user_from_request()
- **File:** `backend-fastapi/auth.py:65`
- **Purpose:** Extracts and validates user from HTTP request
- **Parameters:** `request: Request`, `db: Optional[Session]`
- **Returns:** User object or None
- **Side effects:** None
- **Dependencies:** decode_token, database queries
- **Called by:** Route handlers requiring authentication
- **Error behavior:** Returns None if no valid token
- **Authentication required:** No (but validates authentication)
- **Authorization required:** No
- **Use cases:** All protected route handlers

#### refresh_access_token()
- **File:** `backend-fastapi/auth.py:93`
- **Purpose:** Validates refresh token and issues new access token
- **Parameters:** `refresh_token: str`, `db: Optional[Session]`
- **Returns:** New access token string or None
- **Side effects:** None
- **Dependencies:** decode_token, create_access_token
- **Called by:** refresh route
- **Error behavior:** Returns None if refresh token invalid
- **Authentication required:** No (uses refresh token)
- **Authorization required:** No
- **Use cases:** Token refresh flow

#### require_user()
- **File:** `backend-fastapi/auth.py:109`
- **Purpose:** FastAPI dependency that requires authenticated user
- **Parameters:** `request: Request`, `db: Optional[Session]`
- **Returns:** User object
- **Side effects:** Raises HTTPException 401 if not authenticated
- **Dependencies:** get_user_from_request
- **Called by:** Protected route handlers
- **Error behavior:** Raises HTTPException 401
- **Authentication required:** Yes (enforced)
- **Authorization required:** No
- **Use cases:** Post creation, editing, deletion

### Post Handler Functions

#### Post_handler._post_to_dict()
- **File:** `backend-fastapi/handler/postHandler.py:7`
- **Purpose:** Serializes Post model to dictionary with author info
- **Parameters:** `post`, `user=None`
- **Returns:** Dictionary with all post fields
- **Side effects:** None
- **Dependencies:** None
- **Called by:** All post retrieval functions
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** API response formatting

#### Post_handler._resolve_user()
- **File:** `backend-fastapi/handler/postHandler.py:30`
- **Purpose:** Resolves user for a post (by user_id or githubOwner)
- **Parameters:** `db`, `post`
- **Returns:** User object or None
- **Side effects:** None
- **Dependencies:** Database queries
- **Called by:** _post_to_dict, get_all_posts, get_post_by_id
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Post serialization with author info

#### Post_handler.get_all_posts()
- **File:** `backend-fastapi/handler/postHandler.py:37`
- **Purpose:** Retrieves paginated list of all posts
- **Parameters:** `db`, `offset=0`, `limit=12`
- **Returns:** Dict with posts, total, offset, limit
- **Side effects:** None
- **Dependencies:** Database queries
- **Called by:** GET /api/posts route
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Home page post listing

#### Post_handler.get_post_by_id()
- **File:** `backend-fastapi/handler/postHandler.py:46`
- **Purpose:** Retrieves single post by ID with author info
- **Parameters:** `id`, `db`
- **Returns:** Post dictionary or None
- **Side effects:** None
- **Dependencies:** Database queries
- **Called by:** GET /api/posts/{id} route
- **Error behavior:** Returns None if not found
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Single post view

#### Post_handler.get_post_raw()
- **File:** `backend-fastapi/handler/postHandler.py:53`
- **Purpose:** Retrieves raw Post model (for ownership checks)
- **Parameters:** `id`, `db`
- **Returns:** Post model or None
- **Side effects:** None
- **Dependencies:** Database queries
- **Called by:** delete/update routes for ownership verification
- **Error behavior:** Returns None if not found
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Ownership verification before mutations

#### Post_handler.create_post()
- **File:** `backend-fastapi/handler/postHandler.py:56`
- **Purpose:** Creates new post in database
- **Parameters:** `db`, `data`
- **Returns:** Created Post model
- **Side effects:** Database write
- **Dependencies:** Database session
- **Called by:** POST /api/posts route
- **Error behavior:** Raises database errors
- **Authentication required:** Yes (via require_user)
- **Authorization required:** No (ownership set in route)
- **Use cases:** Post creation

#### Post_handler.delete_post()
- **File:** `backend-fastapi/handler/postHandler.py:63`
- **Purpose:** Deletes post from database
- **Parameters:** `id`, `db`
- **Returns:** Deleted Post model or None
- **Side effects:** Database delete
- **Dependencies:** Database session
- **Called by:** DELETE /api/posts/{id} route
- **Error behavior:** Returns None if not found
- **Authentication required:** Yes (via require_user)
- **Authorization required:** Ownership check in route
- **Use cases:** Post deletion

#### Post_handler.update_post()
- **File:** `backend-fastapi/handler/postHandler.py:71`
- **Purpose:** Updates existing post in database
- **Parameters:** `id`, `db`, `data`
- **Returns:** Updated Post model or None
- **Side effects:** Database update
- **Dependencies:** Database session
- **Called by:** PUT /api/posts/{id} route
- **Error behavior:** Returns None if not found
- **Authentication required:** Yes (via require_user)
- **Authorization required:** Ownership check in route
- **Use cases:** Post editing

### Utility Functions

#### slugify()
- **File:** `backend-fastapi/main.py:67`
- **Purpose:** Converts text to URL-friendly slug
- **Parameters:** `text: str`
- **Returns:** Slugified string
- **Side effects:** None
- **Dependencies:** re module
- **Called by:** createPost route
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Post ID generation from title

#### parse_github_url()
- **File:** `backend-fastapi/main.py:74`
- **Purpose:** Extracts owner/repo from GitHub URL
- **Parameters:** `url: str`
- **Returns:** Tuple of (owner, repo) or (None, None)
- **Side effects:** None
- **Dependencies:** urllib.parse
- **Called by:** GitHub integration routes
- **Error behavior:** Returns (None, None) for invalid URLs
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** GitHub repository data fetching

#### fetch_github_repo()
- **File:** `backend-fastapi/main.py:84`
- **Purpose:** Fetches repository data from GitHub API
- **Parameters:** `owner: str`, `repo: str`, `user_token: str = None`
- **Returns:** Repository data dict or None
- **Side effects:** In-memory caching
- **Dependencies:** httpx, _github_cache
- **Called by:** GitHub info and generation routes
- **Error behavior:** Returns None on API failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Post creation with GitHub data, AI generation

#### fetch_readme()
- **File:** `backend-fastapi/main.py:692`
- **Purpose:** Fetches README content from GitHub repository
- **Parameters:** `owner: str`, `repo: str`, `user_token: str = None`
- **Returns:** README content string (max 4000 chars)
- **Side effects:** None
- **Dependencies:** httpx
- **Called by:** generatePostContent route
- **Error behavior:** Returns empty string on failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** AI content generation

#### generate_with_gemini()
- **File:** `backend-fastapi/main.py:706`
- **Purpose:** Generates post content using Google Gemini API
- **Parameters:** `repo_data: dict`, `readme: str`
- **Returns:** Generated content dict
- **Side effects:** External API call
- **Dependencies:** httpx, GEMINI_API_KEY
- **Called by:** generatePostContent route
- **Error behavior:** Raises exception on API failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** AI-powered post content generation

#### set_session_cookie()
- **File:** `backend-fastapi/main.py:108`
- **Purpose:** Sets HTTP-only session cookie
- **Parameters:** `response`, `token: str`
- **Returns:** None
- **Side effects:** Sets cookie on response
- **Dependencies:** config.py (APP_ENV, JWT_ACCESS_EXPIRY_MINUTES)
- **Called by:** Login and refresh routes
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Session management

#### set_refresh_cookie()
- **File:** `backend-fastapi/main.py:119`
- **Purpose:** Sets HTTP-only refresh token cookie
- **Parameters:** `response`, `token: str`
- **Returns:** None
- **Side effects:** Sets cookie on response
- **Dependencies:** config.py (APP_ENV, JWT_REFRESH_EXPIRY_DAYS)
- **Called by:** Login and refresh routes
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Token refresh management

### Route Handlers

#### login()
- **File:** `backend-fastapi/main.py:140`
- **Purpose:** Handles admin/user login with credentials
- **Parameters:** `body: LoginRequest`, `db: Session`
- **Returns:** JSON response with user data and tokens
- **Side effects:** Sets session and refresh cookies
- **Dependencies:** verify_credentials, create_access_token, create_refresh_token
- **Called by:** POST /api/auth/login
- **Error behavior:** Returns 401 on invalid credentials
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Admin login

#### get_me()
- **File:** `backend-fastapi/main.py:161`
- **Purpose:** Returns current authenticated user
- **Parameters:** `request: Request`, `db: Session`
- **Returns:** User data or null
- **Side effects:** None
- **Dependencies:** get_user_from_request
- **Called by:** GET /api/auth/me
- **Error behavior:** Returns null user if not authenticated
- **Authentication required:** No (but validates)
- **Authorization required:** No
- **Use cases:** Auth state check

#### logout()
- **File:** `backend-fastapi/main.py:184`
- **Purpose:** Clears session cookies
- **Parameters:** None
- **Returns:** Success message
- **Side effects:** Deletes cookies
- **Dependencies:** None
- **Called by:** POST /api/auth/logout
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** User logout

#### refresh()
- **File:** `backend-fastapi/main.py:191`
- **Purpose:** Refreshes access token using refresh token
- **Parameters:** `request: Request`, `db: Session`
- **Returns:** Success response with new session cookie
- **Side effects:** Sets new session cookie
- **Dependencies:** refresh_access_token
- **Called by:** POST /api/auth/refresh
- **Error behavior:** Returns 401 on invalid refresh token
- **Authentication required:** Yes (refresh token)
- **Authorization required:** No
- **Use cases:** Token refresh

#### github_login()
- **File:** `backend-fastapi/main.py:206`
- **Purpose:** Initiates GitHub OAuth flow
- **Parameters:** None
- **Returns:** Redirect to GitHub OAuth
- **Side effects:** None
- **Dependencies:** GITHUB_CLIENT_ID, BACKEND_URL
- **Called by:** GET /api/auth/github
- **Error behavior:** Returns 500 if GitHub OAuth not configured
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** GitHub login initiation

#### github_callback()
- **File:** `backend-fastapi/main.py:219`
- **Purpose:** Handles GitHub OAuth callback
- **Parameters:** `code: str`, `db: Session`
- **Returns:** Redirect to frontend with tokens
- **Side effects:** Creates/updates user, sets cookies
- **Dependencies:** httpx, create_access_token, create_refresh_token
- **Called by:** GET /api/auth/github/callback
- **Error behavior:** Redirects with error on failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** GitHub login completion

#### admin_check()
- **File:** `backend-fastapi/main.py:319`
- **Purpose:** Checks if current user is admin
- **Parameters:** `request: Request`, `db: Session`
- **Returns:** Admin status and user data
- **Side effects:** None
- **Dependencies:** get_user_from_request, ADMIN_GITHUB_IDS
- **Called by:** GET /api/admin/check
- **Error behavior:** Returns 401/403 on failure
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin authentication check

#### admin_login()
- **File:** `backend-fastapi/main.py:349`
- **Purpose:** Admin login with GitHub ID and password
- **Parameters:** `body: AdminLoginRequest`, `db: Session`
- **Returns:** Admin user data and token
- **Side effects:** Sets session and refresh cookies
- **Dependencies:** ADMIN_PASSWORD, ADMIN_GITHUB_IDS, create_access_token
- **Called by:** POST /api/admin/login
- **Error behavior:** Returns 401/403/404 on failure
- **Authentication required:** No (but validates admin)
- **Authorization required:** Admin
- **Use cases:** Admin login

#### admin_dashboard()
- **File:** `backend-fastapi/main.py:384`
- **Purpose:** Returns admin dashboard statistics
- **Parameters:** `request: Request`, `db: Session`
- **Returns:** Statistics, posts, and users
- **Side effects:** None
- **Dependencies:** Database queries
- **Called by:** GET /api/admin/dashboard
- **Error behavior:** Returns 403 if not admin
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin dashboard

#### admin_delete_post()
- **File:** `backend-fastapi/main.py:447`
- **Purpose:** Deletes a post (admin only)
- **Parameters:** `id: str`, `request: Request`, `db: Session`
- **Returns:** Success message
- **Side effects:** Database delete
- **Dependencies:** postHandler
- **Called by:** DELETE /api/admin/posts/{id}
- **Error behavior:** Returns 403/404 on failure
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin content moderation

#### admin_delete_all_posts()
- **File:** `backend-fastapi/main.py:459`
- **Purpose:** Deletes all posts (admin only)
- **Parameters:** `request: Request`, `db: Session`
- **Returns:** Count of deleted posts
- **Side effects:** Database delete
- **Dependencies:** Database queries
- **Called by:** DELETE /api/admin/posts
- **Error behavior:** Returns 403 if not admin
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin content cleanup

#### admin_delete_all_users()
- **File:** `backend-fastapi/main.py:470`
- **Purpose:** Deletes all users (admin only)
- **Parameters:** `request: Request`, `db: Session`
- **Returns:** Count of deleted users
- **Side effects:** Database delete
- **Dependencies:** Database queries
- **Called by:** DELETE /api/admin/users
- **Error behavior:** Returns 403 if not admin
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin user cleanup

#### create_comment()
- **File:** `backend-fastapi/main.py:480`
- **Purpose:** Creates a comment on a post
- **Parameters:** `post_id: str`, `request: Request`, `db: Session`
- **Returns:** Created comment data
- **Side effects:** Database write
- **Dependencies:** require_user, Comment model
- **Called by:** POST /api/posts/{post_id}/comments
- **Error behavior:** Returns 401/400 on failure
- **Authentication required:** Yes
- **Authorization required:** No
- **Use cases:** Comment creation

#### get_comments()
- **File:** `backend-fastapi/main.py:532`
- **Purpose:** Retrieves comments for a post
- **Parameters:** `post_id: str`, `db: Session`
- **Returns:** List of comments with user data
- **Side effects:** None
- **Dependencies:** Database queries with joins
- **Called by:** GET /api/posts/{post_id}/comments
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Comment display

#### admin_update_post()
- **File:** `backend-fastapi/main.py:564`
- **Purpose:** Updates a post (admin only)
- **Parameters:** `id: str`, `body: CreatePostRequest`, `request: Request`, `db: Session`
- **Returns:** Updated post data
- **Side effects:** Database update, optional GitHub API call
- **Dependencies:** postHandler, fetch_github_repo
- **Called by:** PUT /api/admin/posts/{id}
- **Error behavior:** Returns 403/404 on failure
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin content management

#### getPosts()
- **File:** `backend-fastapi/main.py:604`
- **Purpose:** Retrieves paginated posts
- **Parameters:** `request: Request`, `db: Session`
- **Returns:** Paginated posts or fallback data
- **Side effects:** None
- **Dependencies:** postHandler, all_posts fallback
- **Called by:** GET /api/posts
- **Error behavior:** Returns fallback posts on database error
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Home page post listing

#### getPostById()
- **File:** `backend-fastapi/main.py:614`
- **Purpose:** Retrieves single post with comments
- **Parameters:** `id`, `db: Session`
- **Returns:** Post with comments or 404
- **Side effects:** None
- **Dependencies:** postHandler, Database queries
- **Called by:** GET /api/posts/{id}
- **Error behavior:** Returns 404 if not found
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Single post view

#### getGithubInfo()
- **File:** `backend-fastapi/main.py:660`
- **Purpose:** Fetches GitHub repository information
- **Parameters:** `request: Request`, `url: str`, `db: Session`
- **Returns:** Repository metadata
- **Side effects:** In-memory caching
- **Dependencies:** fetch_github_repo, parse_github_url
- **Called by:** GET /api/github/info
- **Error behavior:** Returns 400/404 on failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Post creation with GitHub data

#### generatePostContent()
- **File:** `backend-fastapi/main.py:804`
- **Purpose:** Generates post content using AI
- **Parameters:** `request: Request`, `url: str`, `db: Session`
- **Returns:** Generated content
- **Side effects:** External API calls
- **Dependencies:** fetch_github_repo, fetch_readme, generate_with_gemini
- **Called by:** POST /api/github/generate
- **Error behavior:** Returns 400/404/500 on failure
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** AI-powered content generation

#### createPost()
- **File:** `backend-fastapi/main.py:842`
- **Purpose:** Creates a new post
- **Parameters:** `body: CreatePostRequest`, `request: Request`, `db: Session`
- **Returns:** Created post data
- **Side effects:** Database write, optional GitHub API call
- **Dependencies:** require_user, postHandler, slugify, fetch_github_repo
- **Called by:** POST /api/posts
- **Error behavior:** Returns 409 on duplicate, 403 on repo ownership
- **Authentication required:** Yes
- **Authorization required:** Ownership (set in handler)
- **Use cases:** Post creation

#### deletePost()
- **File:** `backend-fastapi/main.py:887`
- **Purpose:** Deletes a post
- **Parameters:** `id`, `request: Request`, `db: Session`
- **Returns:** Success message
- **Side effects:** Database delete
- **Dependencies:** require_user, postHandler
- **Called by:** DELETE /api/posts/{id}
- **Error behavior:** Returns 404/403 on failure
- **Authentication required:** Yes
- **Authorization required:** Ownership
- **Use cases:** Post deletion

#### updatePost()
- **File:** `backend-fastapi/main.py:906`
- **Purpose:** Updates a post
- **Parameters:** `id`, `body: CreatePostRequest`, `request: Request`, `db: Session`
- **Returns:** Updated post data
- **Side effects:** Database update, optional GitHub API call
- **Dependencies:** require_user, postHandler, fetch_github_repo
- **Called by:** PUT /api/posts/{id}
- **Error behavior:** Returns 404/403 on failure
- **Authentication required:** Yes
- **Authorization required:** Ownership
- **Use cases:** Post editing

## Frontend Functions

### API Client Functions

#### request()
- **File:** `client/src/api/client.js:33`
- **Purpose:** Makes HTTP requests with automatic token refresh
- **Parameters:** `path: string`, `options: object`
- **Returns:** Parsed JSON response
- **Side effects:** Token refresh on 401, localStorage updates
- **Dependencies:** getToken, refreshToken
- **Called by:** All API functions in posts.js
- **Error behavior:** Throws error on failed requests
- **Authentication required:** Uses stored token
- **Authorization required:** No
- **Use cases:** All API communication

#### refreshToken()
- **File:** `client/src/api/client.js:12`
- **Purpose:** Refreshes access token using refresh token
- **Parameters:** None
- **Returns:** Boolean success status
- **Side effects:** Updates localStorage token
- **Dependencies:** getToken, API_BASE
- **Called by:** request() on 401 response
- **Error behavior:** Returns false on failure
- **Authentication required:** Yes (refresh token)
- **Authorization required:** No
- **Use cases:** Token refresh flow

### API Endpoint Functions

#### getPosts()
- **File:** `client/src/api/posts.js:14`
- **Purpose:** Fetches paginated posts
- **Parameters:** `offset: number`, `limit: number`
- **Returns:** Promise with posts data
- **Side effects:** None
- **Dependencies:** request
- **Called by:** Home page
- **Error behavior:** Throws error
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Home page post listing

#### getPostById()
- **File:** `client/src/api/posts.js:17`
- **Purpose:** Fetches single post by ID
- **Parameters:** `id: string`
- **Returns:** Promise with post data
- **Side effects:** None
- **Dependencies:** request
- **Called by:** Post page
- **Error behavior:** Throws error
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Single post view

#### getPostCommentById()
- **File:** `client/src/api/posts.js:19`
- **Purpose:** Fetches comments for a post
- **Parameters:** `id: string`
- **Returns:** Promise with comments array
- **Side effects:** None
- **Dependencies:** request
- **Called by:** Post page, Comments component
- **Error behavior:** Throws error
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Comment display

#### createPost()
- **File:** `client/src/api/posts.js:21`
- **Purpose:** Creates a new post
- **Parameters:** `data: object`
- **Returns:** Promise with created post
- **Side effects:** None
- **Dependencies:** request, authHeaders
- **Called by:** CreatePost page
- **Error behavior:** Throws error
- **Authentication required:** Yes
- **Authorization required:** No
- **Use cases:** Post creation

#### updatePost()
- **File:** `client/src/api/posts.js:28`
- **Purpose:** Updates an existing post
- **Parameters:** `id: string`, `data: object`
- **Returns:** Promise with updated post
- **Side effects:** None
- **Dependencies:** request, authHeaders
- **Called by:** CreatePost page (edit mode)
- **Error behavior:** Throws error
- **Authentication required:** Yes
- **Authorization required:** Ownership
- **Use cases:** Post editing

#### adminUpdatePost()
- **File:** `client/src/api/posts.js:35`
- **Purpose:** Updates a post (admin only)
- **Parameters:** `id: string`, `data: object`
- **Returns:** Promise with updated post
- **Side effects:** None
- **Dependencies:** request, authHeaders
- **Called by:** Admin dashboard
- **Error behavior:** Throws error
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin content management

#### deletePost()
- **File:** `client/src/api/posts.js:42`
- **Purpose:** Deletes a post
- **Parameters:** `id: string`
- **Returns:** Promise with success message
- **Side effects:** None
- **Dependencies:** request, authHeaders
- **Called by:** Post page, Admin dashboard
- **Error behavior:** Throws error
- **Authentication required:** Yes
- **Authorization required:** Ownership/Admin
- **Use cases:** Post deletion

#### deleteAllPosts()
- **File:** `client/src/api/posts.js:48`
- **Purpose:** Deletes all posts (admin only)
- **Parameters:** None
- **Returns:** Promise with deletion count
- **Side effects:** None
- **Dependencies:** request, authHeaders
- **Called by:** Admin dashboard
- **Error behavior:** Throws error
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin content cleanup

#### deleteAllUsers()
- **File:** `client/src/api/posts.js:54`
- **Purpose:** Deletes all users (admin only)
- **Parameters:** None
- **Returns:** Promise with deletion count
- **Side effects:** None
- **Dependencies:** request, authHeaders
- **Called by:** Admin dashboard
- **Error behavior:** Throws error
- **Authentication required:** Yes
- **Authorization required:** Admin
- **Use cases:** Admin user cleanup

#### getGithubInfo()
- **File:** `client/src/api/posts.js:60`
- **Purpose:** Fetches GitHub repository information
- **Parameters:** `url: string`
- **Returns:** Promise with repository metadata
- **Side effects:** None
- **Dependencies:** fetch, authHeaders
- **Called by:** CreatePost page
- **Error behavior:** Throws error with message
- **Authentication required:** No (but uses token if available)
- **Authorization required:** No
- **Use cases:** Post creation with GitHub data

#### generatePostContent()
- **File:** `client/src/api/posts.js:71`
- **Purpose:** Generates post content using AI
- **Parameters:** `url: string`
- **Returns:** Promise with generated content
- **Side effects:** None
- **Dependencies:** fetch, authHeaders
- **Called by:** CreatePost page
- **Error behavior:** Throws error with message
- **Authentication required:** No (but uses token if available)
- **Authorization required:** No
- **Use cases:** AI-powered content generation

### Context Functions

#### AuthProvider.checkAuth()
- **File:** `client/src/context/AuthContext.jsx:30`
- **Purpose:** Checks current authentication status
- **Parameters:** None
- **Returns:** None (updates state)
- **Side effects:** Updates user state, clears auth on failure
- **Dependencies:** getToken, API_BASE, clearAuth
- **Called by:** useEffect on mount, after OAuth callback
- **Error behavior:** Clears auth on any error
- **Authentication required:** No (but validates)
- **Authorization required:** No
- **Use cases:** Initial auth check, token validation

#### AuthProvider.login()
- **File:** `client/src/context/AuthContext.jsx:91`
- **Purpose:** Logs in with credentials
- **Parameters:** `userid: string`, `password: string`
- **Returns:** Boolean success status
- **Side effects:** Updates user state, shows toast
- **Dependencies:** API_BASE, addToast
- **Called by:** Login page
- **Error behavior:** Shows error toast, returns false
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Admin login

#### AuthProvider.logout()
- **File:** `client/src/context/AuthContext.jsx:112`
- **Purpose:** Logs out current user
- **Parameters:** None
- **Returns:** None
- **Side effects:** Clears auth state, calls API
- **Dependencies:** getToken, API_BASE, clearAuth
- **Called by:** ProfileMenu, Header
- **Error behavior:** Ignores API errors
- **Authentication required:** Yes (but clears regardless)
- **Authorization required:** No
- **Use cases:** User logout

#### useAuth()
- **File:** `client/src/context/AuthContext.jsx:136`
- **Purpose:** Hook to access auth context
- **Parameters:** None
- **Returns:** AuthContext value
- **Side effects:** None
- **Dependencies:** React Context
- **Called by:** All authenticated components
- **Error behavior:** None
- **Authentication required:** No
- **Authorization required:** No
- **Use cases:** Access user state and auth methods

## Important Classes

### Post_handler
- **File:** `backend-fastapi/handler/postHandler.py:3`
- **Purpose:** Handles post CRUD operations
- **Methods:** _post_to_dict, _resolve_user, get_all_posts, get_post_by_id, get_post_raw, create_post, delete_post, update_post
- **Dependencies:** Post and User models, database session
- **Used by:** All post-related routes

### CreatePostRequest (Pydantic)
- **File:** `backend-fastapi/main.py:55`
- **Purpose:** Validates post creation/update requests
- **Fields:** title, type, shortDescription, description, hosted, availableAt, github, language, lastPushAt, defaultBranch
- **Dependencies:** Pydantic BaseModel
- **Used by:** POST/PUT /api/posts routes

### LoginRequest (Pydantic)
- **File:** `backend-fastapi/main.py:136`
- **Purpose:** Validates login requests
- **Fields:** userid, password
- **Dependencies:** Pydantic BaseModel
- **Used by:** POST /api/auth/login

### AdminLoginRequest (Pydantic)
- **File:** `backend-fastapi/main.py:345`
- **Purpose:** Validates admin login requests
- **Fields:** github_id, password
- **Dependencies:** Pydantic BaseModel
- **Used by:** POST /api/admin/login

### _SimpleUser
- **File:** `backend-fastapi/auth.py:39`
- **Purpose:** Lightweight user object for fallback cases
- **Attributes:** id, username, name, email, avatar_url, bio, created_at
- **Dependencies:** None
- **Used by:** Fallback when DB user not found

## Function Dependency Graph

```
Post Creation Flow:
createPost()
├── require_user()
│   └── get_user_from_request()
│       └── decode_token()
├── slugify()
├── postHandler.get_post_by_id()
├── fetch_github_repo()
└── postHandler.create_post()

Post Retrieval Flow:
getPostById()
├── postHandler.get_post_by_id()
│   └── _resolve_user()
└── Database query for comments

Authentication Flow:
github_callback()
├── httpx (GitHub API)
├── Database user upsert
├── create_access_token()
├── create_refresh_token()
└── set_session_cookie/set_refresh_cookie()
```

## Performance Considerations

### Caching
- `fetch_github_repo()` uses in-memory cache with 1-hour TTL
- No other caching mechanisms detected

### Database Queries
- `get_all_posts()` uses offset/limit pagination
- Comments limited to 6 per post in API responses
- No query optimization or indexing visible

### External API Calls
- GitHub API calls have 10-second timeout
- Gemini API calls have 30-second timeout
- README fetch limited to 4000 characters