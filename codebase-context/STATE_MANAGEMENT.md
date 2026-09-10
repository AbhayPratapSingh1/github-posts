# State Management

This document explains how state is managed in the Post Panel application.

## Overview

Post Panel uses a lightweight state management approach:
- **React Context** for global state (authentication, notifications)
- **Component state (useState)** for local state
- **localStorage** for persistent state (tokens, cached user data)
- **No external state libraries** (no Redux, Zustand, etc.)

## State Management Architecture

```
┌─────────────────────────────────────────────┐
│          Provider Hierarchy                 │
│                                             │
│  <BrowserRouter>                            │
│    <ToastProvider>                          │
│      <AuthProvider>                         │
│        <App>                               │
│          <Routes>                          │
│            <Home /> (component state)      │
│            <Post /> (component state)      │
│            <CreatePost /> (component state) │
│            ...                             │
│          </Routes>                          │
│      </AuthProvider>                       │
│    </ToastProvider>                        │
│  </BrowserRouter>                           │
└─────────────────────────────────────────────┘
```

## State Stores

### 1. AuthContext (Global)

**Purpose:** Authentication state shared across all components

**File:** `client/src/context/AuthContext.jsx`

**State:**
- `user`: Current user object or null
- `loading`: Boolean indicating auth check in progress

**Actions:**
- `checkAuth()`: Validates current authentication state
- `login(userid, password)`: Login with credentials
- `logout()`: Clear authentication state

**Usage:**
```javascript
const { user, loading, login, logout, checkAuth } = useAuth()
```

**Consumers:** All components that need authentication state
- ProtectedRoute (route guards)
- Header/ProfileMenu (user display)
- CreatePost (owner verification)
- Post page (edit/delete permissions)
- Login page (redirect after login)

**State origin:** Server response from `/api/auth/me` or OAuth callback
**State changes:** Login, logout, OAuth callback, token validation
**Persistence:** localStorage (tokens), session cookies

### 2. ToastContext (Global)

**Purpose:** Notification/toast messages across all components

**File:** `client/src/context/ToastContext.jsx`

**State:**
- Toast messages queue with types (success, error, info)

**Actions:**
- `addToast(message, type, duration)`: Add a notification

**Usage:**
```javascript
const { addToast } = useToast()
addToast("Post created successfully", "success", 3000)
```

**Consumers:** All components
- CreatePost (success/error notifications)
- Post page (delete confirmation)
- AuthContext (login success/error)
- AdminDashboard (action confirmations)

**State origin:** Component actions
**State changes:** Any user action with feedback
**Persistence:** None (session only)

### 3. Component State (Local)

Each page/component manages its own local state via `useState`.

**Home Page State:**
- `posts`: Array of post objects
- `loading`: Loading indicator state
- `offset`: Pagination offset (via ref)
- `hasMore`: Whether more posts exist

**Post Page State:**
- `post`: Single post object
- `comments`: Comments array
- `loading`: Loading indicator state
- `lightbox`: Image lightbox state
- `showComments`: Comments display toggle
- `error`: Error message state

**CreatePost Page State:**
- `form`: Form field values
- `saving`: Submit loading state
- `loadingGithubInfo`: GitHub info fetch state
- `generating`: AI generation state
- `githubInfo`: Fetched repository data
- `quillContent`: Rich text editor content
- `editMode`: Whether editing existing post

**AdminDashboard State:**
- `stats`: Dashboard statistics
- `posts`: Posts list
- `users`: Users list
- `activeTab`: Current tab
- `modal`: Modal state
- `confirmText`: Delete confirmation text

## State Categories

### Global State (Context)
- Authentication state
- Toast notifications
- Mounted once, consumed everywhere

### Local State (useState)
- Form values
- Loading indicators
- UI toggles
- Data fetching results
- Resets on component unmount

### Server State (Fetched)
- Posts data
- Post details
- Comments
- GitHub repo info
- Dashboard statistics
- No caching layer (fetched on every mount)

### Persistent State (localStorage)
- `session_token`: Access token
- `refresh_token`: Refresh token
- `admin_token`: Admin alternative
- `user`: Cached user data
- Used for session persistence across page reloads

## Data Flow

### Authentication State Flow

```
Server response (login/OAuth/me)
  ↓
AuthContext setUser()
  ↓
Context value updates
  ↓
All consumers re-render
  ↓
ProtectedRoute re-evaluates
  ↓
Components conditionally render based on user
```

### Data Fetching Flow

```
Component mounts
  ↓
useEffect triggers
  ↓
API call
  ↓
setState(data)
  ↓
Component re-renders with data
  ↓
Components consume data as props
```

### Form State Flow

```
User types in input
  ↓
onChange handler
  ↓
setForm({...form, field: value})
  ↓
Component re-renders
  ↓
Form validation
  ↓
Submit → API call
```

## State Persistence

### localStorage Keys
| Key | Purpose | Storage Duration |
|-----|---------|------------------|
| `session_token` | Access token | Until logout/expiry |
| `refresh_token` | Token refresh | Until logout/expiry |
| `admin_token` | Admin access | Until logout |
| `user` | Cached user data | Until logout |

### Session Cookies
| Cookie | Purpose | Storage Duration |
|--------|---------|------------------|
| `session` | Access token | JWT_ACCESS_EXPIRY_MINUTES |
| `refresh_token` | Refresh token | JWT_REFRESH_EXPIRY_DAYS |

## State Invocation

### When State Is Invalidated
- **Auth state:** On logout, token expiry, OAuth callback
- **Toast state:** Auto-dismiss after duration
- **Local state:** On component unmount
- **Server data:** No caching - refetched on every mount

### When State Is Refreshed
- **Auth tokens:** On 401 response (auto-refresh in API client)
- **Server data:** Only on component remount or event trigger
- **No optimistic updates** detected

## State Management Patterns

### Pattern 1: Context Provider
```javascript
// Used for: Auth, Toasts
const AppContext = createContext(null)

function AppProvider({ children }) {
  const [state, setState] = useState(null)
  return (
    <AppContext.Provider value={{ state }}>
      {children}
    </AppContext.Provider>
  )
}
```

### Pattern 2: Custom Hook with API
```javascript
// Used for: Data fetching
function usePosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    getPosts().then(data => {
      setPosts(data.posts)
      setLoading(false)
    })
  }, [])
  
  return { posts, loading }
}
```

### Pattern 3: Form State Management
```javascript
// Used for: CreatePost form
const [form, setForm] = useState(initialFormState)
const updateField = (field, value) => {
  setForm(prev => ({ ...prev, [field]: value }))
}
```

## State Management Considerations

### Strengths
- Simple and lightweight
- No additional dependencies
- Easy to understand for new developers
- Works well for small-to-medium application

### Limitations
- No server state caching (redundant fetches)
- No optimistic updates
- Context causes re-renders of all consumers
- No state persistence beyond localStorage
- No offline support
- No deduplication of concurrent requests

### Recommendations
1. Consider React Query/SWR for server state caching
2. Consider useReducer for complex state
3. Consider Zustand if global state grows
4. Add request deduplication
5. Consider optimistic updates for post creation

## Testing State

### Frontend Test Files
- `client/src/tests/context/AuthContext.test.jsx` - Auth context state
- `client/src/tests/context/ToastContext.test.jsx` - Toast state
- `client/src/tests/api/client.test.js` - Token state management

### Test Approach
- Mock API responses
- Use fake timers for toast auto-dismiss
- Verify context state changes
- Verify localStorage interactions