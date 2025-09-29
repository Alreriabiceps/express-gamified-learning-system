# Project Structure

## Root Directory Layout

```
├── backend/          # Node.js/Express API server
├── frontend/         # React/Vite client application
├── .kiro/           # Kiro IDE configuration and steering
└── STUDENT_APPROVAL_SYSTEM.md  # Key feature documentation
```

## Backend Structure (`/backend`)

### Core Directories
```
backend/
├── auth/            # Authentication controllers, middleware, routes
├── config/          # Database, CORS, JWT configuration
├── core/            # Main application routes
├── models/          # Mongoose models (GameRoom, etc.)
├── modules/         # Modular feature organization
│   ├── admin/       # Admin-specific modules
│   ├── auth/        # Authentication modules
│   └── student/     # Student-specific modules
├── services/        # Business logic services
│   ├── gameEngine.js
│   ├── matchQueue.js
│   ├── socketService.js
│   └── messageCleanup.js
├── socket/          # Socket.io game server
├── users/           # User role-based organization
│   ├── admin/       # Admin controllers, models, routes
│   └── students/    # Student controllers, models, routes
├── uploads/         # File upload storage
└── server.js        # Main application entry point
```

### Route Organization
- **Main API**: `/api` - Core application routes
- **Modules**: `/api/modules` - New modular structure
- **Dashboard**: `/api/dashboard` - Dashboard-specific routes
- **Admin**: `/api/admin` - Administrative functions

## Frontend Structure (`/frontend`)

### Core Directories
```
frontend/src/
├── components/      # Reusable UI components
├── contexts/        # React Context providers
├── hooks/          # Custom React hooks
├── layout/         # Layout components
├── shared/         # Shared utilities and components
├── users/          # User role-based components
├── utils/          # Utility functions
├── App.jsx         # Main application component
└── main.jsx        # Application entry point
```

### Path Aliases (Vite Config)
- `@` → `./src`
- `@components` → `./src/components`
- `@pages` → `./src/pages`
- `@hooks` → `./src/hooks`
- `@context` → `./src/context`
- `@utils` → `./src/utils`
- `@services` → `./src/services`

## Key Architectural Patterns

### Backend Patterns
- **Modular Organization**: Features organized in `/modules` with self-contained routes, controllers, models
- **User Role Separation**: `/users/admin` and `/users/students` for role-specific logic
- **Middleware Chain**: Authentication → Authorization → Business Logic
- **Service Layer**: Separate business logic from controllers

### Frontend Patterns
- **Component-Based**: Reusable components in `/components`
- **Feature-Based**: User role organization in `/users`
- **Hook-Based State**: Custom hooks for state management
- **Context for Global State**: User authentication, theme, etc.

## File Naming Conventions

### Backend
- **Controllers**: `[feature]Controller.js`
- **Models**: `[model]Models.js` or `[Model].js`
- **Routes**: `[feature]Routes.js`
- **Middleware**: `[purpose]Middleware.js`
- **Services**: `[service].js`

### Frontend
- **Components**: PascalCase (e.g., `StudentList.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.js`)
- **Utilities**: camelCase (e.g., `apiClient.js`)
- **Pages**: PascalCase (e.g., `Dashboard.jsx`)

## Configuration Files

### Backend
- `server.js` - Main entry point with middleware setup
- `config/` - Environment-specific configurations
- `package.json` - Dependencies and scripts

### Frontend
- `vite.config.js` - Build configuration and aliases
- `package.json` - Dependencies and scripts
- `index.html` - HTML template