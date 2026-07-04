# AI Agent Instructions for Televoto

## Project Overview
Televoto is a real-time voting application for events. It's a full-stack TypeScript project with React frontend and Express backend.

See [README.md](README.md) for React/TypeScript/Vite setup details.

## Quick Start & Build Commands

| Task | Command |
|------|---------|
| Development (frontend + backend) | `npm run dev` |
| Frontend only (Vite HMR) | `npm run dev:client` |
| Backend only | `npm run dev:server` |
| Build for production | `npm run build` |
| Lint | `npm run lint` |
| Database seed | `npm run db:seed` |
| Database migration | `npm run db:migrate` |
| Prisma Studio | `npm run db:studio` |

**Important**: `npm run dev` runs both Vite (port 5173) and Express (port 3001) concurrently via `concurrently`.

## Architecture

### Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express + Cors
- **Database**: SQLite (better-sqlite3) + Prisma ORM
- **Linting**: Oxlint

### Key Directories
- `src/` - React components and frontend logic
  - `src/components/` - Reusable UI components (CandidateCard, Header, ScoreSelector, VoteButton, etc.)
  - `src/api.ts` - Fetch wrapper for `/api/*` endpoints
  - `src/fingerprint.ts` - Device ID generation (FingerprintJS)
- `server/` - Express backend (port 3001)
- `prisma/` - Database schema, migrations, and seed script
- `src/generated/prisma/` - **Auto-generated Prisma client** (do not edit)

### Proxy Configuration
Vite proxies `/api` requests to `http://localhost:3001` (see `vite.config.ts`).

## Data Model

Three Prisma models:
1. **Event** - Votable event (id, name, subtitle, active flag, timestamps)
2. **Candidate** - Candidate in an event (id, number, name, color, link to Event)
3. **Vote** - User vote (candidateId, deviceId, score 1-10, timestamp)
   - Unique constraint: one vote per candidate per device
   - Device ID tracked via fingerprinting

## Development Conventions

### Frontend
- **Components**: All in `src/components/`, use `.tsx` files
- **API calls**: Use functions from `src/api.ts` (not raw fetch)
- **State management**: React hooks (useState, useEffect, useCallback)
- **Styling**: Tailwind CSS via `@tailwindcss/vite`
- **Device tracking**: Use `getDeviceId()` from `src/fingerprint.ts`
- **Types**: Defined in `src/types.ts`

### Backend
- **Server**: `server/index.ts` - Express with Prisma
- **Routes**: RESTful API at `/api/*`
- **Database**: Use `PrismaClient` configured with better-sqlite3 adapter
- **CORS**: Enabled for cross-origin requests

### Database
- **Migrations**: Run with `npm run db:migrate`, stored in `prisma/migrations/`
- **Schema**: `prisma/schema.prisma`
- **Seed**: `prisma/seed.ts` - executed via `npm run db:seed`
- **Adapter**: Uses better-sqlite3 for local dev (can also use libsql for cloud)

### Linting
- Use **Oxlint** (not ESLint) - configured via `.oxlintrc.json`
- Run: `npm run lint`
- See README for enabling type-aware rules

## Common Patterns

### Adding an API Endpoint
1. Add route handler in `server/index.ts`
2. Add fetch wrapper in `src/api.ts`
3. Use in React components via the API wrapper

### Database Changes
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Backend auto-loads new Prisma client

### Component Creation
- Export functional components from `src/components/`
- Import and use in `App.tsx` or other components
- Use Tailwind classes for styling

## Potential Pitfalls

- **Port conflicts**: Ensure ports 5173 (Vite) and 3001 (Express) are free when running `npm run dev`
- **Device ID changes**: FingerprintJS may return different IDs on browser resets; votes are per-device
- **Prisma generation**: Generated code in `src/generated/prisma/` is auto-generated—don't edit it manually; regenerate with `npx prisma generate` if needed
- **Database migrations**: Always run `npm run db:migrate` after schema changes, not just `npx prisma db push`
- **Italian UI**: Some strings are in Italian; maintain consistency when adding new UI text

## Type Definitions

Check `src/types.ts` for TypeScript interfaces (e.g., `EventData`, `Candidate`, `Vote`).

## Browser Compatibility

The app uses modern JavaScript features and requires:
- Fetch API
- ES6+ syntax
- FingerprintJS for device detection
