# Pending Changes

Small changes to batch into a single commit later.

- [x] Remove back icon (`FaArrowLeft`) from Post page navbar (before logo)
- [x] Remove "Back to top" link from Post page footer
- [x] Remove credentials login (User ID/Password input box) from Login page — keep only GitHub login
- [ ] ```
Sure — here's a concise implementation note you can save for later.

 OAuth Sign-In: Return User to Original Page

# OAuth Sign-In: Return User to Original Page

 ## Current Problem

 The current OAuth callback always redirects to the frontend root:

```
redirect_url = f"{FRONTEND_URL}?{params}"
```

 So if a user starts on:

```
/post/123
```

 and clicks **Sign in**, the flow becomes:

```
/post/123
    ↓
/login
    ↓
GitHub OAuth
    ↓
/api/auth/github/callback
    ↓
/
```

 The original page is lost.

 React Router's:

```
<Link to="/login" state={{ from: location }}>
```

 is not ideal for this flow because the user leaves the React application during the GitHub OAuth redirect.

---

 # Recommended Solution

 Use OAuth's `state` parameter to preserve the original route.

 The flow should become:

```
/post/123
    ↓
/login?returnTo=/post/123
    ↓
/auth/github/login?returnTo=/post/123
    ↓
GitHub OAuth
    ↓
/auth/github/callback?code=...&state=/post/123
    ↓
/post/123
```

 The user returns directly to the page where they started.

---

 ## 1\. Comments Section

 When an unauthenticated user clicks **Sign in**, include the current route:

```
import { Link, useLocation } from "react-router-dom"
```

```
const location = useLocation()
```

 Then:

```
<Link
  to={`/login?returnTo=${encodeURIComponent(
    location.pathname + location.search
  )}`}
>
  Sign in
</Link>
```

 For example:

```
/post/123
```

 becomes:

```
/login?returnTo=%2Fpost%2F123
```

---

 ## 2\. Login Page

 Read `returnTo` from the URL:

```
const location = useLocation()

const returnTo =
  new URLSearchParams(location.search).get("returnTo") || "/"
```

 When starting GitHub OAuth, pass it to the backend:

```
window.location.href =
  `${API_BASE}/auth/github/login?returnTo=${encodeURIComponent(returnTo)}`
```

---

 ## 3\. GitHub Login Endpoint

 Change the login endpoint to accept `returnTo`:

```
@app.get("/api/auth/github/login")
async def github_login(returnTo: str = "/"):
```

 Pass it to GitHub as OAuth `state`:

```
params = {
    "client_id": GITHUB_CLIENT_ID,
    "redirect_uri": GITHUB_CALLBACK_URL,
    "scope": "read:user user:email",
    "state": returnTo,
}
```

 Then redirect to GitHub.

---

 ## 4\. GitHub Callback

 Read the OAuth `state`:

```
@app.get("/api/auth/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query("/"),
    db: Session = Depends(get_db),
):
```

 Now:

```
state
```

 contains the original route:

```
/post/123
```

 Validate it before using it:

```
return_to = state if state.startswith("/") else "/"
```

 This prevents using an arbitrary external URL as the redirect destination.

---

 ## 5\. Redirect After Successful OAuth

 Currently:

```
redirect_url = f"{FRONTEND_URL}?{params}"
```

 Instead, redirect to:

```
redirect_url = f"{FRONTEND_URL}{return_to}"
```

 However, the current implementation also puts:

```
token
refresh
user
```

 into the URL.

 Ideally, change this as well.

---

 # Recommended Final OAuth Callback

 Since the callback already sets cookies:

```
set_session_cookie(response, access)
set_refresh_cookie(response, refresh_token)
```

 there is no need to expose the tokens in the URL.

 The final part should eventually look like:

```
return_to = state if state.startswith("/") else "/"

response = RedirectResponse(
    url=f"{FRONTEND_URL}{return_to}"
)

set_session_cookie(response, access)
set_refresh_cookie(response, refresh_token)

return response
```

 Then the final flow is:

```
/post/123
      ↓
/login?returnTo=/post/123
      ↓
GitHub OAuth
      ↓
callback
      ↓
session cookies are set
      ↓
/post/123
```

 No access token or refresh token needs to appear in the browser URL.

---

 # Important Security Notes

 ## Validate `returnTo`

 Don't blindly redirect to a URL supplied by the user.

 Good:

```
return_to = state if state.startswith("/") else "/"
```

 Better validation can ensure it is an internal application path only.

 Avoid accepting:

```
https://evil-site.com
```

 as a redirect destination.

 ## Use OAuth `state`

 The OAuth `state` parameter is the appropriate mechanism for carrying information through the external OAuth flow.

 It can also be used for CSRF protection, so when implementing this properly, consider using a server-side/random state value rather than treating the raw return URL itself as the complete OAuth state.

---

 # Future UX Improvement

 After returning to the original post, automatically focus the comment input.

 Example flow:

```
User is reading /post/123

        ↓

"Want to join the discussion?"
                    [Sign in]

        ↓

GitHub OAuth

        ↓

/post/123

        ↓

[ Write a comment... ] [Post]
          ↑
       focused
```

 This makes authentication feel like a continuation of the user's original action rather than an interruption.

---

 # Summary

 The preferred architecture is:

```
Original page
    ↓
Login page
    ↓
returnTo
    ↓
OAuth state
    ↓
GitHub
    ↓
OAuth callback
    ↓
Set authentication cookies
    ↓
Redirect to returnTo
```

 Use **OAuth `state`**, not React Router `location.state`, as the mechanism for preserving the destination across the external GitHub OAuth redirect.

 Also, since the callback already sets authentication cookies, plan to **remove access/refresh tokens from the redirect URL** in the future.```