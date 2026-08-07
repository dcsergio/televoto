# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Televoto: web app for running live voting events (public/judge voting, admin panel, final rankings — the "Classifica" page). Frontend Angular + Angular Material (in `client/`); backend Express + Prisma (repo root); database PostgreSQL. UI text and server error messages are primarily **Italian** — keep new strings consistent with that.

The repo is an npm workspace: the root `package.json` owns the Express/Prisma backend and declares `client` as a workspace member for the Angular frontend. One `npm install` at the root installs both.

## Commands

| Task | Command |
|------|---------|
| Full dev (frontend + backend) | `npm run dev` |
| Frontend only | `npm run dev:client` |
| Backend only | `npm run dev:server` |
| Build (backend typecheck + frontend) | `npm run build` |
| Lint (backend only) | `npm run lint` |
| Frontend smoke tests (Vitest) | `npm run test:client` |
| DB seed | `npm run db:seed` |
| DB migration (deploy) | `npm run db:migrate` |
| DB migration via pooler | `npm run db:migrate:pooler` |
| DB push (no migration history) | `npm run db:push` |
| Prisma Studio | `npm run db:studio` |

Notes:
- `npm run dev` starts the Angular dev server (`ng serve`, port 8080) and Express (port 3001) concurrently via `concurrently`. The Angular dev server proxies `/api/*` to `http://localhost:3001` (`client/proxy.conf.json`) — CORS is disabled server-side (`cors({origin:false})`), so this proxy is required, not optional. A port-8080 conflict fails startup outright.
- `npm run build` runs `tsc -b` (backend typecheck, `server/`/`prisma.config.ts`) then `ng build` inside `client/`. The Angular build's `outputPath` is configured to land at repo-root `dist/` (not the Angular-default `dist/client/browser/`) so `server/index.ts`'s static-file serving finds `dist/index.html` unmodified.
- `prebuild` runs `prisma generate` automatically.
- Backend: no test runner (no `test` script at the root level); verify via `npm run lint`, `npm run build`, and manual exercising through the dev server. Frontend: `npm run test:client` runs a thin Vitest smoke-test layer (pure utility functions, not full component coverage) via the Angular CLI's default test builder.
- Lint uses `oxlint` (config in `.oxlintrc.json`) for the backend only — `client/**` is excluded (`ignorePatterns`). There is currently no configured linter for the Angular frontend.

## Environment

Copy `.env.example` to `.env`. Key variables:
- `SUPABASE_DIRECT_URL` — direct DB URL (port 5432), used for Prisma migrations.
- `SUPABASE_DATABASE_URL` (or `DATABASE_URL`) — pooled URL (port 6543), used by the server at runtime. Server reads `DATABASE_URL` first, falling back to `SUPABASE_DATABASE_URL`.
- `PRISMA_CLI_URL` — optional override for Prisma CLI datasource, see `prisma.config.ts` for priority order.
- `ADMIN_AUTH_SECRET` — required; server throws at startup if missing. Signs admin/manager session tokens.
- `ROOT_ADMIN_PASSWORD` — seeds the root credential only if the root credentials table is empty.

The frontend has no separate API-base-URL env var — `client/src/app/api/*.api.ts` all call the relative path `/api/...`, relying on the dev-server proxy (dev) or same-origin deployment (prod/Vercel).

## Architecture

### Two-tier auth model
There is no user-account system — instead two independent, password-based auth layers, both implemented in `server/index.ts`:
1. **Root auth** (`requireRootAuth`) — one global root password (`RootCredential` table), gates `/admin` and cross-event endpoints (list/create events, root/event-manager password rotation). Login: `POST /api/auth/root/login`.
2. **Event manager auth** (`requireEventManagerAuth`) — one password per event (`EventManagerCredential`, unique on `eventId`), gates candidate management, judge-code management, voting lifecycle (start/close/reset), and rankings for that specific event. Login: `POST /api/auth/event/login`. This is what gates `/manager` (and, separately, the rankings view on `/score`).

The backend accepts a root token wherever an event-manager token is expected (`requireEventManagerAuth` lets `payload.role === "root"` bypass the per-event `eventId` check) — a deliberate superuser escalation, not a leak. `/manager` (`EventManagerShellComponent`) takes advantage of this on the frontend too: it tries `rootAuthToken() ?? eventManagerAuthToken()`, so root can open any event's workspace from `/admin` without a separate manager-password prompt. `/score` (`ScoreComponent`) does not do this — it only checks `isEventManagerAuthenticated()`, so root still has to enter that event's manager password there.

Both issue signed, self-contained bearer tokens (`createAuthToken`/`verifyAuthToken`, HMAC via `ADMIN_AUTH_SECRET`, TTL `authTokenTtlSeconds` = 12h) — there is no server-side session store. Passwords are stored as PBKDF2 hash+salt (`hashPassword`/`verifyPassword`, 210000 iterations), never plaintext.

On the frontend, `client/src/app/state/auth-state.service.ts` holds the root and event-manager tokens as signals and persists them to `sessionStorage` (survives a page refresh, cleared when the tab closes) — the only client-side persistence in the app.

Voter identity for public voting is **not** device-fingerprinted — there is no fingerprinting library or `deviceId` concept anywhere in this codebase. A vote is unique per `(candidateId, judgeTokenId)`; see "Judge tokens" below.

### Judge tokens (opaque, hashed, streamed)
Judges don't log in with the admin auth system — the admin issues single-use opaque tokens (`JudgeToken` model) shared via link/QR code. Tokens are generated with `generateOpaqueToken`, stored only as a hash (`hashOpaqueToken`) plus a `tokenPreview`, and carry a `VoterType` (`QUALIFICATA` weighted judge vs `POPOLARE` general public) and lifecycle `VoterStatus`/timestamps (`usedAt`, `finalizedAt`, `revokedAt`). A vote is unique per `(candidateId, judgeTokenId)`. `GET /api/events/:eventId/judge-tokens/stream` is an SSE endpoint (`judgeTokenStreamClients` map) pushing live token/progress updates to the admin voting-progress dashboard — new judge-token or voting-progress logic must keep both the mutation route and this stream in sync. On the frontend, `client/src/app/api/judge-token-stream.service.ts` wraps the native `EventSource` in an RxJS `Observable` for `JudgeCodeManagerComponent`.

### Ranking / scoring algorithm
Implemented in `GET /api/rankings/:eventId` (`server/index.ts`) — not derivable from the schema alone:
- Qualified-judge average is divided by the count of *eligible non-revoked* `QUALIFICATA` tokens for the event (not just the judges who actually voted), so abstentions pull a candidate's average down.
- Popular-vote average optionally uses a trimmed mean (`enableTrimmedMean` + `trimmedMeanPercentage` on `Event`) to reduce outlier impact, via `computeTrimmedMean`.
- Final score blends both pools using per-event weights (`weightQualificata` / `weightPopolare`, default 70/30, expected to sum to 100).
- Ties (within 0.001) break first on the qualified average, then on candidate `number`.

`GET /api/events/:eventId/partial-rankings` computes a related but distinct in-progress view for the live dashboard — check both when changing scoring behavior.

### Event lifecycle
`POST /api/events/:eventId/start` runs a transaction that renumbers candidates sequentially, clears all votes, and reopens voting — treat it as a destructive reset, not an incremental update. `DELETE /api/candidates/:id` also renumbers remaining candidates to keep numbers contiguous. Voting itself is gated by `Event.votingClosed`/`PUT /api/events/:eventId/voting-state`, and candidate edits are blocked while voting is open (enforced in the admin UI).

### Frontend routing
Angular Router (`client/src/app/app.routes.ts`) with exactly four flat top-level routes: `''` (voting, `VotingShellComponent`), `admin` (`AdminShellComponent`, root-only cross-event management), `manager` (`EventManagerShellComponent`, single-event operational management), `score` (`ScoreComponent`) — no nested path segments. This mirrors a hard backend constraint: `server/index.ts` only serves the SPA's `index.html` as a fallback for the exact paths `GET /`, `GET /admin`, `GET /manager`, `GET /score` (no wildcard), so a real Angular child route like `/admin/events` would 404 on direct load or refresh. Adding a fifth flat route means updating three places in lockstep: `app.routes.ts`, this `server/index.ts` fallback list, and `vercel.json`'s `rewrites`.

Event context flows via `?eventCode=` query param; judge access via `?judgeToken=` (16-char opaque token, displayed/entered in 4x4 segments — see `client/src/app/shared/judge-token.util.ts`). Both `admin` and `manager` persist their active section in `?adminSection=` via `router.navigate` with `queryParamsHandling: 'merge'` (not real child routes, for the same reason) — `admin` only has `dashboard|events` (see `client/src/app/pages/admin-shell/admin.util.ts`); `manager` has its own `dashboard|candidates|voting-codes|voting-backstage` (see `client/src/app/pages/event-manager-shell/event-manager-shell.util.ts`).

Auth gating for `/admin`, `/manager` and `/score` is inline (no `canActivate` guard/redirect): each shell component checks `AuthStateService`'s signals and renders either a password-prompt form (`ProtectedPageGateComponent`) or the real content. `/manager` additionally requires an `?eventCode=` query param first (via `EventCodeGateComponent`, same pattern as `/score`) to resolve which event's manager password to prompt for — there is no cross-event switcher on that page, by design (an event manager must never be able to see or reach another event).

### API layer boundary
`client/src/app/api/*.api.ts` — one Angular service per backend resource area (`auth`, `events`, `candidates`, `voting`, `rankings`, `judge-tokens`) wrapping `HttpClient` — is the only place that should call the backend; components/pages go through these services, not `HttpClient` directly. When adding/changing a backend endpoint: update `server/index.ts`, add/update the matching method in the relevant `*.api.ts`, then wire it into the page/component. A functional `HttpInterceptorFn` (`client/src/app/api/auth.interceptor.ts`) attaches the `Authorization: Bearer` header for requests tagged with the `AUTH_TOKEN` `HttpContext` token (see `withAuth()`); errors are normalized via `client/src/app/api/http-error.util.ts`. Shared types live in `client/src/app/models/types.ts` (`EventData`, `CandidateData`); API-only shapes like `RankingEntry` live alongside their `*.api.ts` file.

### Deployment duality (Vercel serverless vs long-running server)
The same Express app (`server/index.ts`) runs two ways:
- Locally / self-hosted: `tsx server/index.ts` as a normal long-running process (serves the built SPA itself when `NODE_ENV=production` or `SERVE_CLIENT=true`).
- On Vercel: `api/[...path].ts` is a catch-all serverless function that rewrites the request path to `/api/...` and lazily imports the compiled `server/index.js`, passing the request/response straight through. `vercel.json` rewrites all `/api/*`, `/admin`, `/manager`, and `/score` traffic accordingly, and bundles `server/**` and `src/generated/prisma/**` as included files for the function. `vercel.json`'s `framework` is `null` (generic build detection) since the build is Angular-driven, not Vite-driven.

Do not fork logic between these two entry points — `api/[...path].ts` should stay a thin adapter.

### Prisma
- Generated client lives in `src/generated/prisma/` (custom `output` in `prisma/schema.prisma`) — never hand-edit; regenerate with `npx prisma generate` (also runs automatically via `prebuild`). This is the only thing left under the repo-root `src/` directory — the former React app that used to live there has been fully replaced by `client/`.
- After schema changes, use `npm run db:migrate` (not just `db:push`) to preserve migration history, unless intentionally prototyping.
- `prisma.config.ts` picks the CLI datasource URL from, in order: `PRISMA_CLI_URL` → `DIRECT_DATABASE_URL` → `SUPABASE_DIRECT_URL` → `DATABASE_URL` → `SUPABASE_DATABASE_URL`.
- `scripts/create_db_from_zero.sql` recreates the database from scratch (drop + create) for local resets; `scripts/bootstrap-db.ts` handles programmatic bootstrap (e.g. seeding the root credential from `ROOT_ADMIN_PASSWORD`).

### Angular Material theming
`client/src/styles/_material-theme.scss` defines a custom M3 theme (`mat.theme()`, dark, cyan/violet palettes) whose system CSS variables (`--mat-sys-primary`, `--mat-sys-surface`, etc.) are re-pointed at the same hex values as the app's pre-existing "Neon Dark" design tokens (`@theme` block in `client/src/styles.scss`, ported unchanged from the old `src/index.css`). Angular Material components are used for genuinely interactive chrome (`MatDialog` for the confirm-destructive-action pattern — see `ConfirmDialogComponent` — and `MatSnackBar` for toasts via `ToastService`); highly custom visual elements (score buttons, candidate cards, hero banner, Classifica reveal) stay hand-rolled CSS/Tailwind, matching the original design rather than being forced into Material components. Tailwind v4 is still used for utility classes, wired via `@tailwindcss/postcss` (not `@tailwindcss/vite`, since the Angular CLI's esbuild-based builder doesn't take Vite plugins).

## Key files

- `server/index.ts` — backend bootstrap (mounts `server/routes/*.ts`, static SPA fallback for the four top-level routes). Route handlers, auth, scoring, and SSE logic live in `server/routes/`, `server/middleware/`, `server/services/`, `server/repositories/`.
- `client/src/app/app.routes.ts` — the four top-level routes.
- `client/src/app/pages/voting-shell/` — public voting page (event-code gate, judge-code entry, candidate voting, 7s voting-state poll).
- `client/src/app/pages/admin-shell/` — root-only SPA, cross-event concerns only (dashboard overview, event CRUD, weights, root/manager password rotation). Links out to `/manager?eventCode=` for day-to-day event operation.
- `client/src/app/pages/event-manager-shell/` — single-event SPA (`/manager`), reachable via event code + manager password (or a root session). Hosts the components below; never exposes other events.
- `client/src/app/components/score/` — final rankings display and reveal presentation flow (UI-labeled "Classifica" in Italian).
- `client/src/app/components/event-candidates-manager/`, `event-lifecycle-controls/` — candidates CRUD and start/close/reset-ranking controls used by `event-manager-shell`; input/output-driven (`eventId`/`authToken`/`votingClosed`), not tied to a specific parent shell.
- `client/src/app/components/judge-code-manager/`, `voting-progress-dashboard/` — judge-token issuance (SSE + QR + print) and live progress UI, same input-driven pattern, used by `event-manager-shell`.
- `client/src/app/api/*.api.ts` — the only fetch boundary (see "API layer boundary" above).
- `client/src/app/state/*.service.ts` — signal-based shared app state (`AuthStateService`, `VotingStateService`).
- `prisma/schema.prisma` — data model.
- `prisma.config.ts` — Prisma CLI datasource resolution.
- `client/proxy.conf.json` — dev-server proxy config (`/api` → `http://localhost:3001`), the Angular CLI equivalent of the old `vite.config.ts` proxy.
- `client/angular.json` — Angular CLI project config, including the `outputPath` override that makes the build land in repo-root `dist/`.
- `api/[...path].ts` — Vercel serverless adapter around the Express app.
