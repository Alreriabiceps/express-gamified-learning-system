# Technology Stack

## Backend (Node.js/Express)

### Core Technologies
- **Runtime**: Node.js with CommonJS modules
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens, Passport.js (Google, Facebook, GitHub OAuth)
- **Real-time**: Socket.io for multiplayer games and live features
- **File Processing**: Multer for uploads, PDF parsing, document extraction

### Key Dependencies
- `bcryptjs` - Password hashing
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment configuration
- `jsonwebtoken` - JWT authentication
- `mongoose` - MongoDB object modeling
- `socket.io` - Real-time bidirectional communication
- `nodemailer` - Email services
- `openai` - AI integration
- `mammoth`, `pdf-parse`, `textract` - Document processing

### Architecture Patterns
- Modular route structure under `/modules`
- Middleware-based authentication and authorization
- Service layer for business logic (gameEngine, matchQueue, socketService)
- Controller-based request handling

## Frontend (React/Vite)

### Core Technologies
- **Framework**: React 18.3.1 with JSX
- **Build Tool**: Vite with ES modules
- **Styling**: TailwindCSS 4.x with DaisyUI components
- **State Management**: React Query for server state, Context API for global state
- **Routing**: React Router DOM 7.x
- **3D Graphics**: Three.js with React Three Fiber

### Key Dependencies
- `@tanstack/react-query` - Server state management
- `axios` - HTTP client
- `socket.io-client` - Real-time client
- `framer-motion` - Animations
- `react-chartjs-2` - Data visualization
- `antd` - UI component library
- `@react-three/fiber` - 3D rendering

### Development Tools
- **Testing**: Vitest with jsdom
- **Linting**: ESLint 9.x
- **Type Safety**: PropTypes (considering TypeScript migration)

## Development Commands

### Backend
```bash
# Development with auto-reload
npm run dev

# Production start
npm start
```

### Frontend
```bash
# Development server with HMR
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with UI
npm test:ui

# Test coverage
npm test:coverage
```

## Environment Configuration

### Backend (.env)
- Database connection strings
- JWT secrets
- OAuth client credentials
- Email service configuration
- OpenAI API keys

### Frontend (Vite Proxy)
- API proxy to `http://localhost:5000`
- Path aliases for clean imports (@components, @pages, etc.)

## Deployment
- Backend: Vercel-ready with vercel.json
- Frontend: Vite build optimized for Vercel deployment
- Database: MongoDB Atlas (production)