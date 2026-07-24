# AI Agent Instructions for Televoto

## Scope
This file contains only project-specific guidance for AI coding agents.
For generic setup and template-level details, see [README.md](README.md).

## Runbook

| Task | Command |
|------|---------|
| Full dev (frontend + backend) | `npm run dev` |
| Frontend only | `npm run dev:client` |
| Backend only | `npm run dev:server` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| DB seed | `npm run db:seed` |
| DB migration | `npm run db:migrate` |
| Prisma Studio | `npm run db:studio` |

Notes:
- `npm run dev` starts Vite (port 8080) and Express (port 3001) concurrently.
- Vite uses `strictPort: true`; port 8080 conflicts will fail startup.
- `npm run build` runs TypeScript build (`tsc -b`) before `vite build`.

## Architecture Boundaries
- Frontend app: `src/` (React + Tailwind).
- Frontend API layer: `src/api.ts` (use wrappers here, avoid raw `fetch` in components).
- Backend API: `server/index.ts` (Express routes under `/api/*`).
- DB schema/migrations: `prisma/schema.prisma` and `prisma/migrations/`.
- Generated Prisma client: `src/generated/prisma/` (do not edit manually).

## Backend API Surface
Server routes are centralized in `server/index.ts`:
- Event state: `GET /api/events/active`, `GET /api/events/:eventId`
- Device votes: `GET /api/events/:eventId/votes/:deviceId`
- Vote cast/update: `POST /api/vote`
- Admin candidates: `GET /api/candidates/:eventId`, `POST /api/candidates`, `PUT /api/candidates/:id`, `DELETE /api/candidates/:id`
- Admin event controls: `PUT /api/events/:eventId/voting-state`, `POST /api/events/:eventId/start`, `DELETE /api/events/:eventId/votes`
- Hall of Fame: `GET /api/rankings/:eventId`

When adding/changing endpoints:
1. Update `server/index.ts`.
2. Add/update wrapper in `src/api.ts`.
3. Wire usage in components.

## Project Conventions
- UI text and server errors are primarily Italian. Keep language consistent.
- Device identity comes from `getDeviceId()` in `src/fingerprint.ts`; voting is per device.
- Vote score must stay integer 1-10 (validated server-side).
- Types used by UI are in `src/types.ts` (`EventData`, `CandidateData`); `RankingEntry` lives in `src/api.ts`.
- Accesso admin: autenticazione root server-side con token firmato (`/api/auth/root/login`).
- Accesso gestione candidato/giudici: autenticazione manager evento legata a `eventId` (`/api/auth/event/login`).

## Known Pitfalls
- `DELETE /api/candidates/:id` reorders remaining candidate numbers to keep them sequential.
- `POST /api/events/:eventId/start` performs a transaction that renumbers candidates, clears votes, and reopens voting.
- Do not hand-edit generated Prisma files in `src/generated/prisma/`; regenerate with `npx prisma generate` if needed.
- After schema changes, use `npm run db:migrate` (not only `prisma db push`) to preserve migration history.

## Key Files
- Frontend composition: `src/App.tsx`
- Reusable components: `src/components/`
- API client wrappers: `src/api.ts`
- Backend server: `server/index.ts`
- Vite proxy/ports: `vite.config.ts`
- Prisma schema: `prisma/schema.prisma`
