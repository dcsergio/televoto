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
| DB migration (via pooler) | `npm run db:migrate:pooler` |
| DB push (no migration history) | `npm run db:push` |
| Prisma Studio | `npm run db:studio` |
| E2E tests | `npm run test:e2e` |

Notes:
- `npm run dev` starts the Angular dev server (`ng serve`, port 8080) and Express (port 3001) concurrently. The Angular dev server proxies `/api/*` to Express (`client/proxy.conf.json`) — required because the backend disables CORS.
- Port 8080 conflicts will fail startup outright.
- `npm run build` runs the backend TypeScript build (`tsc -b`) then `ng build` inside `client/`; the Angular output is configured to land in repo-root `dist/`, not `client/dist/`.

## Architecture Boundaries
- Frontend app: `client/src/app/` (Angular standalone components, signals, Angular Material, Tailwind). Pages: `admin-shell` (root-only, `/admin`), `event-manager-shell` (single-event ops, `/manager`), `voting-shell` (public voting, `/`); Classifica lives in `client/src/app/components/score/` (`/score`).
- Frontend API layer: `client/src/app/api/*.api.ts` (one Angular service per resource area; use these, avoid raw `HttpClient` calls in components/pages).
- Backend: `server/index.ts` only bootstraps the Express app (helmet/cors/json middleware, SPA static fallback) and mounts routers — it does not hold route logic itself. Route handlers live in `server/routes/*.ts` split by resource (`auth`, `events`, `candidates`, `judge-tokens`, `votes`, `rankings`); each delegates to `server/services/*.ts`, which use `server/repositories/*.ts` for Prisma access. Auth helpers live in `server/middleware/auth.middleware.ts` and `server/lib/`.
- Vercel adapter: `api/[...path].ts` lazily imports the compiled `server/index.js` and rewrites the request path — keep it a thin pass-through, never fork route logic between it and `server/index.ts`.
- DB schema/migrations: `prisma/schema.prisma` and `prisma/migrations/`.
- Generated Prisma client: `src/generated/prisma/` (do not edit manually) — this is the only thing left under the repo-root `src/` directory; the former React app there has been fully replaced by `client/`.

## Backend API Surface
Routes are split across `server/routes/*.ts` (~28 routes total). Key groups:
- Auth (`auth.routes.ts`): `POST /api/auth/root/login`, `POST /api/auth/root/password`, `POST /api/auth/event/login`
- Events (`events.routes.ts`): `GET/POST /api/events`, `GET /api/events/by-code/:eventCode`, `GET/PUT /api/events/:eventId`, `PUT /api/events/:eventId/manager-password`, `GET /api/events/:eventId/voting-progress`, `PUT /api/events/:eventId/voting-state`, `POST /api/events/:eventId/start`, `DELETE /api/events/:eventId/votes`
- Voting (`votes.routes.ts`): `POST /api/vote` (judge-token gated, not device-based, rate-limited)
- Candidates (`candidates.routes.ts`): `GET /api/candidates/:eventId`, `POST /api/candidates`, `PUT /api/candidates/:id`, `DELETE /api/candidates/:id`
- Judge tokens (`judge-tokens.routes.ts`): `GET/POST /api/events/:eventId/judge-tokens`, `GET /api/events/:eventId/judge-tokens/stream` (SSE), `POST /api/judge-tokens/validate`, `POST /api/judge-tokens/finalize`, `POST /api/judge-tokens/:id/reissue` (lost-judge-code recovery), `POST /api/judge-tokens/:id/revoke`
- Rankings (`rankings.routes.ts`): `GET /api/rankings/:eventId`, `GET /api/events/:eventId/partial-rankings`

When adding/changing endpoints:
1. Update the relevant `server/routes/*.ts` (and its `service`/`repository` if logic or data access changes).
2. Add/update the matching method in the relevant `client/src/app/api/*.api.ts`.
3. Wire usage into the page/component.
4. If touching judge-token or voting-progress logic, keep it in sync with the `judge-tokens/stream` SSE push (`server/services/voting-progress.service.ts`).

## Project Conventions
- UI text and server errors are primarily Italian. Keep language consistent.
- There is no device-fingerprinting anywhere in this codebase. Voting identity is judge-token-based: a vote is unique per `(candidateId, judgeTokenId)`, gated by the opaque `judgeToken` sent in the `POST /api/vote` body — not a device ID.
- Vote score must be integer 1-10, or `null` for an abstention (validated server-side, `server/validation/vote.schemas.ts`).
- Types used by the UI are in `client/src/app/models/types.ts` (`EventData`, `CandidateData`); API-only shapes like `RankingEntry` live alongside their `*.api.ts` file.
- Root/event-manager bearer tokens are held as signals in `client/src/app/state/auth-state.service.ts` and persisted to `sessionStorage`.
- Two auth layers, both password-based, no user-account system: root (`requireRootAuth`, one global password, gates `/admin` + cross-event endpoints, `/api/auth/root/login`) and event-manager (`requireEventManagerAuth`, one password per event, gates `/manager` + candidate/judge-token/voting-lifecycle endpoints, `/api/auth/event/login`). A root token is also accepted wherever an event-manager token is expected (deliberate superuser bypass) — `/manager` takes advantage of this so root can open any event without a manager password; `/score` deliberately does not.
- Judges never use the root/manager auth system — they get single-use opaque `JudgeToken`s (link/QR), stored only as a hash + preview, carrying a `VoterType` (`QUALIFICATA` weighted vs `POPOLARE` general public).

## Known Pitfalls
- `DELETE /api/candidates/:id` reorders remaining candidate numbers to keep them sequential.
- `POST /api/events/:eventId/start` performs a transaction that renumbers candidates, clears votes, and reopens voting — treat as a destructive reset, not an incremental update.
- Do not hand-edit generated Prisma files in `src/generated/prisma/`; regenerate with `npx prisma generate` if needed.
- After schema changes, use `npm run db:migrate` (not only `prisma db push`) to preserve migration history.
- The backend only serves the SPA's `index.html` as a fallback for the exact paths `GET /`, `GET /admin`, `GET /manager`, `GET /score` (no wildcard route) — the Angular app must not introduce real nested routes under any of them (it uses query params instead, see `?adminSection=`, shared by both `admin` and `manager`). Adding a fifth top-level route means updating `client/src/app/app.routes.ts`, this fallback list in `server/index.ts`, and `vercel.json`'s `rewrites` together.
- Ranking math (`server/services/ranking.service.ts`, used by both `GET /api/rankings/:eventId` and the partial-rankings endpoint) divides the qualified-judge average by the count of *eligible non-revoked* `QUALIFICATA` tokens, not just judges who voted — abstentions pull the average down. Popular-vote average can use a trimmed mean (`Event.enableTrimmedMean`/`trimmedMeanPercentage`). Final score blends both pools via `weightQualificata`/`weightPopolare` (default 70/30).

## Key Files
- Frontend routes: `client/src/app/app.routes.ts`
- Frontend composition: `client/src/app/pages/`, `client/src/app/components/`
- API client wrappers: `client/src/app/api/*.api.ts`
- Backend bootstrap: `server/index.ts`; route/service/repository logic: `server/routes/`, `server/services/`, `server/repositories/`, `server/middleware/`
- Vercel serverless adapter: `api/[...path].ts`
- Dev-server proxy/ports: `client/proxy.conf.json`, `client/angular.json`
- Prisma schema: `prisma/schema.prisma`
