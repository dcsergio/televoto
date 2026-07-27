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
| Lint (backend only) | `npm run lint` |
| Frontend smoke tests | `npm run test:client` |
| DB seed | `npm run db:seed` |
| DB migration | `npm run db:migrate` |
| Prisma Studio | `npm run db:studio` |

Notes:
- `npm run dev` starts the Angular dev server (`ng serve`, port 8080) and Express (port 3001) concurrently. The Angular dev server proxies `/api/*` to Express (`client/proxy.conf.json`) — required because the backend disables CORS.
- Port 8080 conflicts will fail startup outright.
- `npm run build` runs the backend TypeScript build (`tsc -b`) then `ng build` inside `client/`; the Angular output is configured to land in repo-root `dist/`, not `client/dist/`.

## Architecture Boundaries
- Frontend app: `client/src/app/` (Angular standalone components, signals, Angular Material, Tailwind).
- Frontend API layer: `client/src/app/api/*.api.ts` (one Angular service per resource area; use these, avoid raw `HttpClient` calls in components/pages).
- Backend API: `server/index.ts` (Express routes under `/api/*`).
- DB schema/migrations: `prisma/schema.prisma` and `prisma/migrations/`.
- Generated Prisma client: `src/generated/prisma/` (do not edit manually) — this is the only thing left under the repo-root `src/` directory; the former React app there has been fully replaced by `client/`.

## Backend API Surface
Server routes are centralized in `server/index.ts` (~25 routes total). Key groups:
- Auth: `POST /api/auth/root/login`, `POST /api/auth/root/password`, `POST /api/auth/event/login`
- Events: `GET/POST /api/events`, `GET /api/events/by-code/:eventCode`, `GET/PUT /api/events/:eventId`, `PUT /api/events/:eventId/manager-password`, `PUT /api/events/:eventId/voting-state`, `POST /api/events/:eventId/start`, `DELETE /api/events/:eventId/votes`
- Voting: `POST /api/vote` (judge-token gated, not device-based), `GET /api/events/:eventId/voting-progress`
- Candidates: `GET /api/candidates/:eventId`, `POST /api/candidates`, `PUT /api/candidates/:id`, `DELETE /api/candidates/:id`
- Judge tokens: `GET/POST /api/events/:eventId/judge-tokens`, `GET /api/events/:eventId/judge-tokens/stream` (SSE), `POST /api/judge-tokens/validate`, `POST /api/judge-tokens/finalize`, `POST /api/judge-tokens/:id/revoke`
- Rankings: `GET /api/rankings/:eventId`, `GET /api/events/:eventId/partial-rankings`

When adding/changing endpoints:
1. Update `server/index.ts`.
2. Add/update the matching method in the relevant `client/src/app/api/*.api.ts`.
3. Wire usage into the page/component.

## Project Conventions
- UI text and server errors are primarily Italian. Keep language consistent.
- There is no device-fingerprinting anywhere in this codebase. Voting identity is judge-token-based: a vote is unique per `(candidateId, judgeTokenId)`, gated by the opaque `judgeToken` sent in the `POST /api/vote` body — not a device ID.
- Vote score must stay integer 1-10 (validated server-side).
- Types used by the UI are in `client/src/app/models/types.ts` (`EventData`, `CandidateData`); API-only shapes like `RankingEntry` live alongside their `*.api.ts` file.
- Root/event-manager bearer tokens are held as signals in `client/src/app/state/auth-state.service.ts` and persisted to `sessionStorage`.
- Accesso admin: autenticazione root server-side con token firmato (`/api/auth/root/login`).
- Accesso gestione candidato/giudici: autenticazione manager evento legata a `eventId` (`/api/auth/event/login`).

## Known Pitfalls
- `DELETE /api/candidates/:id` reorders remaining candidate numbers to keep them sequential.
- `POST /api/events/:eventId/start` performs a transaction that renumbers candidates, clears votes, and reopens voting.
- Do not hand-edit generated Prisma files in `src/generated/prisma/`; regenerate with `npx prisma generate` if needed.
- After schema changes, use `npm run db:migrate` (not only `prisma db push`) to preserve migration history.
- The backend only serves the SPA's `index.html` as a fallback for the exact paths `GET /`, `GET /admin`, `GET /hof` (no wildcard route) — the Angular app must not introduce real nested routes under `/admin` or `/hof` (it uses query params instead, see `?adminSection=`).

## Key Files
- Frontend routes: `client/src/app/app.routes.ts`
- Frontend composition: `client/src/app/pages/`, `client/src/app/components/`
- API client wrappers: `client/src/app/api/*.api.ts`
- Backend server: `server/index.ts`
- Dev-server proxy/ports: `client/proxy.conf.json`, `client/angular.json`
- Prisma schema: `prisma/schema.prisma`
