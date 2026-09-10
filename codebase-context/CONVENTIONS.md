# Coding Conventions

This document catalogs the actual coding conventions observed in the Post Panel codebase.

> Only conventions that can be observed from the code are documented. No invented conventions.

## Naming Conventions

### Backend (Python)

| Pattern | Example | Location |
|---------|---------|----------|
| `snake_case` for functions | `create_access_token`, `fetch_github_repo` | `backend-fastapi/` |
| `snake_case` for variables | `post_id`, `github_owner` | `backend-fastapi/` |
| `PascalCase` for classes | `Post_handler`, `_SimpleUser` | `backend-fastapi/` |
| `UPPER_SNAKE_CASE` for constants | `JWT_SECRET`, `GITHUB_CACHE_TTL` | `backend-fastapi/` |
| Leading underscore for internal | `_post_to_dict`, `_resolve_user` | `backend-fastapi/` |
| API path `camelCase` fields | `shortDescription`, `githubOwner`, `dateOfCreation` | API responses |

**Note:** `Post_handler` uses `snake_case` naming for the class (unusual - should be `PascalCase` per PEP8, but that's what the code uses).

### Frontend (JavaScript/React)

| Pattern | Example | Location |
|---------|---------|----------|
| `camelCase` for variables/functions | `getPostById`, `hasMore` | `client/src/` |
| `PascalCase` for components | `CreatePost`, `AdminDashboard` | `client/src/` |
| `PascalCase` for context providers | `AuthProvider`, `ToastProvider` | `client/src/` |
| `UPPER_SNAKE_CASE` for constants | `API_BASE`, `POST_TYPE` | `client/src/` |
| `useXxx` for hooks | `useAuth`, `useToast` | `client/src/` |

## File Organization

### Backend
- Single-file architecture: most routes in `main.py`
- Models in `app/models.py`
- Handlers in `handler/`
- Migration scripts in `alembic/versions/`
- Tests in `tests/`

### Frontend
- Components in `src/components/` (PascalCase filenames, e.g., `ProfileMenu.jsx`)
- Pages in `src/pages/` (PascalCase filenames, e.g., `CreatePost.jsx`)
- API functions in `src/api/`
- Context providers in `src/context/`
- Configuration in `src/config/`
- Tests in `src/tests/` (mirror structure: `tests/components/`, `tests/context/`)

## Component Patterns

### React Component Structure
- Default export function components
- Hooks at top of component
- JSX with Tailwind classes

```jsx
function Component({ prop }) {
  const [state, setState] = useState(null)
  const { user } = useAuth()
  
  useEffect(() => {
    // fetch data
  }, [])
  
  return (
    <div className="tailwind-classes">
      {state}
    </div>
  )
}

export default Component
```

### Component Export Style
- Default exports for components (observed in most components)
- Named exports for API functions and context hooks

## Service Patterns

### Backend Handler Pattern
```python
class Post_handler:
    def _private_method(self, ...):
        # internal helper
        
    def public_method(self, db, ...):
        # business logic
```

### API Route Pattern
```python
@app.get('/api/...')
def route_name(request: Request, db: Session = Depends(get_db)):
    # 1. Authentication (if needed)
    user = require_user(request, db)
    
    # 2. Business logic
    result = handler.method(...)
    
    # 3. Error handling
    if not result:
        return JSONResponse(status_code=404, content={"error": "..."})
    
    # 4. Response
    return result
```

## API Patterns

### Endpoint Naming
- `GET /api/posts` - List resources
- `POST /api/posts` - Create resource
- `GET /api/posts/{id}` - Get single resource
- `PUT /api/posts/{id}` - Update resource
- `DELETE /api/posts/{id}` - Delete resource
- `/api/auth/*` - Authentication
- `/api/admin/*` - Admin operations

### Response Format
- Success: plain JSON objects/arrays
- Error: `JSONResponse(status_code=XXX, content={"error": "..."})`

### Authentication Pattern
- Bearer token in header OR cookie
- `require_user()` dependency for protected routes

## Database Patterns

### Model Definition
```python
class Model(Base):
    __tablename__ = 'table_name'
    id = Column(Integer, primary_key=True, autoincrement=True)
    field = Column(String)
    json_field = Column(JSON)
```

### Timestamp Pattern
- ISO 8601 strings for `created_at`/`updated_at`
- Unix timestamp (Integer) for `dateOfCreation`

### JSON Fields
- Used for flexible data: `hosted`, `availableAt`, `stats`

### No SQLAlchemy Relationships
- Manual joins in queries
- Manual ownership checks

## Error Patterns

### Backend
```python
# Not found
return JSONResponse(status_code=404, content={"error": "..."})

# Not authenticated
raise HTTPException(status_code=401, detail="Not authenticated")

# Not authorized
return JSONResponse(status_code=403, content={"error": "Not authorized"})

# Conflict
return JSONResponse(status_code=409, content={"error": "A post with this title already exists"})
```

### Frontend
```javascript
// API call in try/catch
try {
  const data = await apiFunction()
  // handle success
} catch (e) {
  addToast(e.message, "error")
}
```

## Import Conventions

### Backend
```python
# Standard library first
import os
import re
from datetime import datetime

# Third-party
import httpx
from fastapi import FastAPI

# Local
from config import X
from app.models import Y
from handler import Z
```

### Frontend
```javascript
// Third-party
import React, { useState } from 'react'
import { Route } from 'react-router-dom'

// Local (relative imports)
import request from './client'
import { useAuth } from '../context/AuthContext'
```

**Note:** No path aliases used; all imports are relative or package-based.

## State Management Patterns

### Context Provider Pattern
```javascript
// Create context
const Context = createContext(null)

// Provider component
export function Provider({ children }) {
  const [state, setState] = useState(...)
  return (
    <Context.Provider value={{ state, actions }}>
      {children}
    </Context.Provider>
  )
}

// Hook
export function useContextHook() {
  return useContext(Context)
}
```

### localStorage Usage
```javascript
// Store
localStorage.setItem("key", value)

// Retrieve
localStorage.getItem("key")

// Remove
localStorage.removeItem("key")
```

## Testing Conventions

### Frontend Test Structure
```javascript
import { describe, it, expect, vi } from 'vitest'

describe('ComponentName', () => {
  it('should do something', () => {
    expect(result).toBe(expected)
  })
})
```

### Backend Test Structure
```python
def test_something():
    # Setup
    user = create_test_user()
    
    # Act
    result = some_function(...)
    
    # Assert
    assert result == expected
```

### Test Fixtures (Backend)
- `conftest.py` for shared fixtures
- `auth_headers` for authenticated requests
- `create_test_user`/`create_test_post` factories

## Styling Conventions

### Tailwind CSS (v4)
- Utility classes directly in JSX
- No CSS modules
- `@tailwindcss/typography` for `prose` classes
- Custom styles in `index.css`

### Example
```jsx
<button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
  Submit
</button>
```

## Git/Commit Conventions

### Detected
- Feature-oriented PRs to `main`
- GitHub Actions CI on all PRs
- Automated deployment on main push

### Not Detected
- No conventional commit format visible
- No branch naming convention observable from repo

## Backend Route Conventions

### Route Grouping
- Comments separate major route groups:
  ```python
  # ── Auth routes ──────────────────────────────────────────────────────
  # ── Admin routes ─────────────────────────────────────────────────────
  # ── Post routes ──────────────────────────────────────────────────────
  ```

### Database Access
- `db: Session = Depends(get_db)` pattern
- `postHandler` singleton for post operations

## JSON Serialization Conventions

### Post Model
- Includes camelCase field names matching database columns
- Adds computed fields: `authorName`, `authorUsername`
- Null handling: fields set to None

### User Model
- Excludes sensitive fields (`github_token`)
- Includes computed fields: `is_admin`

## Observed Anti-Conventions

### Inconsistencies
1. `Post_handler` uses snake_case for a class name (should be PascalCase)
2. Mixed error patterns: some routes use `JSONResponse`, some raise `HTTPException`
3. Debug `print()` statements left in admin routes
4. Database fallback swalls all exceptions (including programming errors)
5. `all_posts.py` module name doesn't follow file naming conventions

## Conventions to Maintain

When writing new code, follow these observed patterns:
1. Keep backend routes in the single-file `main.py` style
2. Use `JSONResponse(status_code=X, content={"error": "..."})` for errors
3. Use `require_user(request, db)` for protected routes
4. Check ownership with `post.user_id != user.id`
5. Use camelCase for API response fields
6. Use ISO 8601 timestamps
7. Use Tailwind utility classes for styling
8. Import API functions from `api/posts.js`
9. Use context hooks (`useAuth()`, `useToast()`) rather than prop drilling
10. Follow the pagination pattern (`offset`/`limit` query params)