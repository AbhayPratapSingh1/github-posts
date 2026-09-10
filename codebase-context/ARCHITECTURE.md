# Architecture

This document describes the actual architecture of the Post Panel application as implemented in the codebase.

## Overview

Post Panel is a two-tier web application with a React SPA frontend and a FastAPI Python backend. The application follows a client-server architecture with clear separation between frontend rendering and backend business logic.

## Application Layers

### 1. Presentation Layer (Frontend)
- **Purpose:** User interface rendering and interaction
- **Location:** `client/src/`
- **Responsibilities:**
  - Route handling and navigation
  - Component rendering
  - Form handling and validation
  - API communication
  - Client-side state management
- **Dependencies:** React, React Router, Tailwind CSS
- **Called by:** User interactions
- **Calls:** API layer, context providers

### 2. API Layer (Backend)
- **Purpose:** HTTP request handling and response formatting
- **Location:** `backend-fastapi/main.py`
- **Responsibilities:**
  - Route definition and request parsing
  - Input validation (Pydantic models)
  - Authentication/authorization checks
  - Response serialization
  - Error handling
- **Dependencies:** FastAPI, Pydantic
- **Called by:** HTTP clients (frontend, tools)
- **Calls:** Service/handler layer, auth functions

### 3. Business Logic Layer
- **Purpose:** Domain logic and data processing
- **Location:** `backend-fastapi/handler/postHandler.py`, `backend-fastapi/main.py` (inline functions)
- **Responsibilities:**
  - Post CRUD operations
  - GitHub integration logic
  - AI content generation
  - Data transformation
- **Dependencies:** Database models, external APIs
- **Called by:** API layer
- **Calls:** Repository/ORM, external services

### 4. Data Access Layer
- **Purpose:** Database operations and data persistence
- **Location:** `backend-fastapi/database.py`, `backend-fastapi/app/models.py`
- **Responsibilities:**
  - Database connection management
  - ORM model definitions
  - Query execution
  - Transaction handling
- **Dependencies:** SQLAlchemy, PostgreSQL
- **Called by:** Business logic layer
- **Calls:** Database

### 5. Authentication Layer
- **Purpose:** User identity verification and authorization
- **Location:** `backend-fastapi/auth.py`
- **Responsibilities:**
  - Token creation/validation
  - User lookup
  - Permission checking
  - Session management
- **Dependencies:** JWT library, database
- **Called by:** API layer (route guards)
- **Calls:** Database (user lookup)

## Frontend Architecture

### Component Structure
```
App.jsx
├── BrowserRouter
│   └── Routes
│       ├── Home (public)
│       ├── Login (public)
│       ├── Post (public)
│       ├── CreatePost (protected)
│       ├── AdminLogin (public)
│       └── AdminDashboard (admin)
├── ToastProvider (global)
└── AuthProvider (global)
```

### State Management
- **Global State:** React Context (AuthContext, ToastContext)
- **Local State:** Component-level useState/useEffect
- **No external stores:** No Redux, Zustand, or similar

### Data Flow
1. User interaction triggers component state change
2. Component calls API function
3. API function makes HTTP request to backend
4. Backend processes request and returns response
5. Component updates state with response data
6. React re-renders affected components

## Backend Architecture

### Single-File Design
The backend uses a monolithic design with most logic in `main.py`:
- Route definitions
- Inline utility functions
- Business logic
- External API integrations

### Key Components
1. **FastAPI App:** `main.py` - Application instance and middleware
2. **Route Handlers:** `main.py` - All API endpoints
3. **Post Handler:** `handler/postHandler.py` - Post CRUD operations
4. **Auth Module:** `auth.py` - Authentication functions
5. **Database:** `database.py` - Connection and session management
6. **Models:** `app/models.py` - SQLAlchemy ORM models
7. **Config:** `config.py` - Environment variable loading

### Request Lifecycle
```
HTTP Request
  ↓
CORS Middleware
  ↓
Route Handler
  ↓
Authentication Check (if required)
  ↓
Input Validation (Pydantic)
  ↓
Business Logic Execution
  ↓
Database Operations (if needed)
  ↓
External API Calls (if needed)
  ↓
Response Serialization
  ↓
HTTP Response
```

## Database Architecture

### Connection Pattern
- SQLAlchemy engine with connection pooling
- Session-per-request pattern via FastAPI dependency injection
- Graceful degradation: returns None on connection failure

### ORM Usage
- Declarative base models
- No relationships defined (manual joins in queries)
- JSON columns for flexible data storage

## Service Boundaries

### Internal Services
1. **Post Service:** Post CRUD, GitHub integration
2. **Auth Service:** Token management, user resolution
3. **User Service:** User management (via auth)

### External Integrations
1. **GitHub API:** OAuth, repository data
2. **Gemini API:** Content generation
3. **PostgreSQL:** Data persistence

## Shared Modules

### Backend Shared
- `config.py`: Environment configuration
- `database.py`: Database connection
- `auth.py`: Authentication utilities

### Frontend Shared
- `api/client.js`: HTTP client with refresh logic
- `context/AuthContext.jsx`: Authentication state
- `context/ToastContext.jsx`: Notification system

## Authentication Boundary

### Backend Enforcement
- `require_user()` dependency for protected routes
- Manual ownership checks in route handlers
- Admin role verification via GitHub ID allowlist

### Frontend Enforcement
- `ProtectedRoute` component for route guards
- Auth context for UI state
- Token storage in localStorage

## Authorization Boundary

### Role-Based Access
1. **Anonymous:** Read-only access to posts
2. **Authenticated User:** Create/edit/delete own posts, comment
3. **Admin:** Manage all users/posts, access dashboard

### Ownership Verification
- Post operations verify `post.user_id == user.id`
- GitHub repository ownership verified via API

## Data Flow Patterns

### Read Operations
```
Client → API → Handler → Database → Response
```

### Write Operations
```
Client → API → Validation → Auth Check → Handler → Database → Response
```

### External API Operations
```
Client → API → Handler → External API → Process → Database → Response
```

## Rendering Lifecycle (Frontend)

1. Route match triggers component mount
2. Component checks authentication state
3. Component fetches data (if needed)
4. Component renders with current state
5. User interactions trigger state updates
6. State changes cause re-renders

## Background Processing

### Current Implementation
- **No formal background jobs:** All processing is synchronous
- **In-memory caching:** GitHub API responses cached for 1 hour
- **Startup tasks:** Database column migration on app startup

### Potential Improvements
- Queue system for AI generation
- Background GitHub data synchronization
- Scheduled cache invalidation

## Important Files Reference

### Backend Core
- `backend-fastapi/main.py` - Application entry point
- `backend-fastapi/auth.py` - Authentication logic
- `backend-fastapi/config.py` - Configuration
- `backend-fastapi/database.py` - Database setup
- `backend-fastapi/app/models.py` - Data models
- `backend-fastapi/handler/postHandler.py` - Business logic

### Frontend Core
- `client/src/main.jsx` - Application entry
- `client/src/App.jsx` - Route definitions
- `client/src/api/client.js` - HTTP client
- `client/src/context/AuthContext.jsx` - Auth state
- `client/src/pages/` - Page components
- `client/src/components/` - Reusable components

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                         │
│  React SPA (Vite + Tailwind CSS + React Router)            │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│  FastAPI (Python) with CORS, JWT Auth                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ Business      │   │ External      │
│ Logic         │   │ Services      │
│ (Handlers)    │   │ (GitHub, AI)  │
└───────┬───────┘   └───────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  SQLAlchemy ORM → PostgreSQL                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### Observed
1. **Single-file backend:** All routes in `main.py` (~950 lines)
2. **No ORM relationships:** Manual joins in queries
3. **Dual token storage:** Cookies + localStorage
4. **Inline business logic:** Some logic in routes, some in handlers
5. **In-memory caching:** Simple dict with TTL

### Inferred
1. **Monorepo structure:** Frontend and backend in same repository
2. **Development-first design:** Some production concerns not fully addressed
3. **Rapid iteration:** Focus on features over architectural purity

## Trade-offs and Considerations

### Current Strengths
- Simple deployment (single backend process)
- Easy local development setup
- Clear separation between frontend and backend

### Current Limitations
- Single-file backend may become maintainability challenge
- No formal service layer pattern
- Limited error handling in some areas
- No background job processing

### Future Considerations
- Backend refactoring into multiple modules
- Introduction of service layer pattern
- Background job processing for AI generation
- More comprehensive error handling
- Database relationship optimization