# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Televoto: web app for running live voting events (public/judge voting, admin panel, final rankings — the "Classifica" page). Frontend Angular + Angular Material (in `client/`); backend Express + Prisma (repo root); database PostgreSQL. UI text and server error messages are primarily **Italian** — keep new strings consistent with that.

The repo is an npm workspace: the root `package.json` owns the Express/Prisma backend and declares `client` as a workspace member for the Angular frontend. One `npm install` at the root installs both.

## Commands

See `package.json` `scripts` for the full command list (dev, dev:client, dev:server, build, lint, test:client, db:seed, db:migrate, db:migrate:pooler, db:push, db:studio).

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
There is no user-account system — instead two independent, password-based auth layers, both implemented in `server/middleware/auth.middleware.ts`:
1. **Root auth** (`requireRootAuth`) — one global root password (`RootCredential` table), gates `/admin` and cross-event endpoints (list/create events, root/event-manager password rotation). Login: `POST /api/auth/root/login`.
2. **Event manager auth** (`requireEventManagerAuth`) — one password per event (`EventManagerCredential`, unique on `eventId`), gates candidate management, judge-code management, voting lifecycle (start/close/reset), and rankings for that specific event. Login: `POST /api/auth/event/login`. This is what gates `/manager` (and, separately, the rankings view on `/score`).

The backend accepts a root token wherever an event-manager token is expected (`requireEventManagerAuth` lets `payload.role === "root"` bypass the per-event `eventId` check) — a deliberate superuser escalation, not a leak. `/manager` (`EventManagerShellComponent`) takes advantage of this on the frontend too: it tries `rootAuthToken() ?? eventManagerAuthToken()`, so root can open any event's workspace from `/admin` without a separate manager-password prompt. `/score` (`ScoreComponent`) does not do this — it only checks `isEventManagerAuthenticated()`, so root still has to enter that event's manager password there.

Both issue signed, self-contained bearer tokens (`createAuthToken`/`verifyAuthToken`, HMAC via `ADMIN_AUTH_SECRET`, TTL `authTokenTtlSeconds` = 12h) — there is no server-side session store. Passwords are stored as PBKDF2 hash+salt (`hashPassword`/`verifyPassword`, 210000 iterations), never plaintext.

On the frontend, `client/src/app/state/auth-state.service.ts` holds the root and event-manager tokens as signals and persists them to `sessionStorage` (survives a page refresh, cleared when the tab closes) — the only client-side persistence in the app.

Voter identity for public voting is **not** device-fingerprinted — there is no fingerprinting library or `deviceId` concept anywhere in this codebase. A vote is unique per `(candidateId, judgeTokenId)`; see "Judge tokens" below.

### Judge tokens (opaque, hashed, streamed)
Judges don't log in with the admin auth system — the admin issues single-use opaque tokens (`JudgeToken` model) shared via link/QR code. Tokens are generated with `generateOpaqueToken`, stored only as a hash (`hashOpaqueToken`) plus a `tokenPreview`, and carry a `VoterType` (`QUALIFICATA` weighted judge vs `POPOLARE` general public) and lifecycle `VoterStatus`/timestamps (`usedAt`, `finalizedAt`, `revokedAt`). A vote is unique per `(candidateId, judgeTokenId)`. `GET /api/events/:eventId/judge-tokens/stream` is an SSE endpoint (`judgeTokenStreamClients` map) pushing live token/progress updates to the admin voting-progress dashboard — new judge-token or voting-progress logic must keep both the mutation route and this stream in sync. On the frontend, `client/src/app/api/judge-token-stream.service.ts` wraps the native `EventSource` in an RxJS `Observable` for `JudgeCodeManagerComponent`.

Because the opaque code is only ever stored hashed, a judge who loses it cannot recover the original — instead `POST /api/judge-tokens/:id/reissue` (event-manager auth) revokes the old token, mints a new one, and re-parents that judge's existing votes onto the new token id so their progress survives. `JudgeCodeManagerComponent` exposes this as a "Rigenera" button per judge. `POST /api/events/:eventId/judge-tokens/reissue-all` (event-manager auth) does the same in bulk for every currently-active token of the event in one transaction — used for the "Rigenera tutti i codici" button; it returns the new plaintext codes (used/revoked tokens are left untouched). "Azzera classifica" (`DELETE /api/events/:eventId/votes`) deliberately does **not** reissue — it only reactivates the same token values — so re-showing codes after a reset is exactly what "Rigenera tutti i codici" is for.

Voters are also gated by `Event.popularVoteMode` (`NUMERIC` default, or `PREFERENCE`) — see "Popular vote modes" below.

### Popular vote modes (numeric vs preference ballot)
`Event.popularVoteMode` (`PopularVoteMode` enum: `NUMERIC` | `PREFERENCE`) plus `Event.maxPreferences` (int, default 1), chosen at event creation and **immutable afterward**. `QUALIFICATA` judges always vote numerically (1-10 per candidate), regardless of this setting — it only changes how `POPOLARE` voters vote:
- `NUMERIC` (default): unchanged 1-10 scoring per candidate.
- `PREFERENCE`: an approval/election-style ballot — the voter picks up to `maxPreferences` candidates, `vote.service.ts` forces `score = 1` and rejects a new preference once the token already has `maxPreferences` votes on other candidates (`maxPreferences = 1` reproduces the old single-choice behaviour). The frontend passes an `isPreferenceVoteMode` flag through `castVote`; `voting-shell.ts` shows a "Preferenze espresse X/N" counter.

`ranking.service.ts` branches on this in `avgPopolare`: for `PREFERENCE` events it's `computePopularVoteShare` — the candidate's share of all preferences cast, scaled to a 0-10 range — instead of `computeTrimmedMean`, so `enableTrimmedMean`/`trimmedMeanPercentage` are meaningless (and hidden in the admin UI) for `PREFERENCE` events.

### Ranking / scoring algorithm
Implemented in `GET /api/rankings/:eventId` (`server/routes/rankings.routes.ts`, `server/services/ranking.service.ts`) — not derivable from the schema alone:
- Qualified-judge average is divided by the count of *eligible non-revoked* `QUALIFICATA` tokens for the event (not just the judges who actually voted), so abstentions pull a candidate's average down.
- Popular-vote average is a plain mean over the popular votes *actually cast* for that candidate (optionally a trimmed mean — `enableTrimmedMean` + `trimmedMeanPercentage` on `Event` — to reduce outlier impact, via `computeTrimmedMean`). Unlike the qualified pool, unexpressed popular votes are **not** counted as zero: public participation can be discontinuous over the evening, so a voter who doesn't vote must not drag a candidate down.
- Final score blends both pools using per-event weights (`weightQualificata` / `weightPopolare`, default 70/30, expected to sum to 100) via `blendFinalScore`, which divides by the *actual* sum of the applied weights rather than a hard-coded 100. When a candidate received **zero** popular votes, the popular component is dropped entirely and the qualified weight is renormalised to 100% (final score = qualified average) — otherwise that candidate would eat a `0 * weightPopolare` penalty for an absence rather than a judgement. `avgPopolare` is still reported as `0` in that case (with `popularVoteCount === 0`); the Classifica UI shows "n/d (esclusa dal calcolo)" instead of `0`.
- Ties (within 0.001) break first on the qualified average, then on candidate `number`.

`GET /api/events/:eventId/partial-rankings` computes a related but distinct in-progress view for the live dashboard — check both when changing scoring behavior.

### Event lifecycle
`POST /api/events/:eventId/start` runs a transaction that renumbers candidates sequentially, clears all votes, and reopens voting — treat it as a destructive reset, not an incremental update. `DELETE /api/events/:eventId/votes` ("Azzera classifica") is the lighter reset: it clears all votes and, like `start`, flips every non-revoked judge token back to `ACTIVE` (`resetJudgeTokensForRestart` — same token value, so distributed links/QRs keep working) but does not renumber candidates or reopen voting; both paths must stay in sync on the judge-token reset, and both broadcast the judge-token SSE snapshot after responding. `DELETE /api/candidates/:id` also renumbers remaining candidates to keep numbers contiguous. Voting itself is gated by `Event.votingClosed`/`PUT /api/events/:eventId/voting-state`, and candidate edits are blocked while voting is open (enforced in the admin UI).

Opening the Classifica (`/score`) while `votingClosed` is `false` is blocked in the UI: the "Apri Classifica" action (event backstage, manager toolbar, admin toolbar) shows a dialog telling the operator to close voting first instead of navigating there (see `event-lifecycle-controls.ts`, and the duplicated check in `admin-shell.ts`/`event-manager-shell.ts`).

Archiving reuses `Event.active` (previously always `true`) as an archive flag rather than a soft-delete: `PUT /api/events/:eventId/archive-state` flips it. Archived events drop out of the admin's active event selector/lists and surface only in the admin "Archiviati" section, which can disarchive them or clone them via `POST /api/events/:eventId/clone` — cloning duplicates the event, its candidates, and its weights into a new event (votes and judge tokens are not carried over). The manager password is **not** copied: the caller must supply a new `managerPassword` (min 8 chars) and `name` in the request body, plus an optional `code` (1-5 digits; a fresh code is generated when omitted). The admin UI prompts for these via `CloneEventDialogComponent`.

### Frontend routing
Angular Router (`client/src/app/app.routes.ts`) with exactly four flat top-level routes: `''` (voting, `VotingShellComponent`), `admin` (`AdminShellComponent`, root-only cross-event management), `manager` (`EventManagerShellComponent`, single-event operational management), `score` (`ScoreComponent`) — no nested path segments. This mirrors a hard backend constraint: `server/index.ts` only serves the SPA's `index.html` as a fallback for the exact paths `GET /`, `GET /admin`, `GET /manager`, `GET /score` (no wildcard), so a real Angular child route like `/admin/events` would 404 on direct load or refresh. Adding a fifth flat route means updating three places in lockstep: `app.routes.ts`, this `server/index.ts` fallback list, and `vercel.json`'s `rewrites`.

Event context flows via `?eventCode=` query param; judge access via `?judgeToken=` (16-char opaque token, displayed/entered in 4x4 segments — see `client/src/app/shared/judge-token.util.ts`). Both `admin` and `manager` persist their active section in `?adminSection=` via `router.navigate` with `queryParamsHandling: 'merge'` (not real child routes, for the same reason) — `admin` only has `dashboard|create-events|edit-events|archived|settings` (see `client/src/app/pages/admin-shell/admin.util.ts` — `create-events` holds the new-event form, `edit-events` the per-event editor + event selector, `archived` lists archived events with disarchive/clone actions (see "Event lifecycle" above), `settings` the root-password rotation); `manager` has its own `dashboard|candidates|voting-codes|voting-backstage` (see `client/src/app/pages/event-manager-shell/event-manager-shell.util.ts`).

Auth gating for `/admin`, `/manager` and `/score` is inline (no `canActivate` guard/redirect): each shell component checks `AuthStateService`'s signals and renders either a password-prompt form (`ProtectedPageGateComponent`) or the real content. `/manager` additionally requires an `?eventCode=` query param first (via `EventCodeGateComponent`, same pattern as `/score`) to resolve which event's manager password to prompt for — there is no cross-event switcher on that page, by design (an event manager must never be able to see or reach another event).

### API layer boundary
`client/src/app/api/*.api.ts` — one Angular service per backend resource area (`auth`, `events`, `candidates`, `voting`, `rankings`, `judge-tokens`) wrapping `HttpClient` — is the only place that should call the backend; components/pages go through these services, not `HttpClient` directly. When adding/changing a backend endpoint: update the relevant `server/routes/*.ts` (plus its `service`/`repository`), add/update the matching method in the relevant `*.api.ts`, then wire it into the page/component. A functional `HttpInterceptorFn` (`client/src/app/api/auth.interceptor.ts`) attaches the `Authorization: Bearer` header for requests tagged with the `AUTH_TOKEN` `HttpContext` token (see `withAuth()`); errors are normalized via `client/src/app/api/http-error.util.ts`. Shared types live in `client/src/app/models/types.ts` (`EventData`, `CandidateData`); API-only shapes like `RankingEntry` live alongside their `*.api.ts` file.

### Deployment duality (Vercel serverless vs long-running server)
The same Express app (`server/index.ts`) runs two ways:
- Locally / self-hosted: `tsx server/index.ts` as a normal long-running process (serves the built SPA itself when `NODE_ENV=production` or `SERVE_CLIENT=true`).
- On Vercel: `api/[...path].ts` is a catch-all serverless function that rewrites the request path to `/api/...` and lazily imports the compiled `server/index.js`, passing the request/response straight through. `vercel.json` rewrites all `/api/*`, `/admin`, `/manager`, and `/score` traffic accordingly, and bundles `server/**` and `src/generated/prisma/**` as included files for the function. `vercel.json`'s `framework` is `null` (generic build detection) since the build is Angular-driven, not Vite-driven.

Do not fork logic between these two entry points — `api/[...path].ts` should stay a thin adapter.

### Prisma
- All application tables live in a dedicated PostgreSQL schema **`televoto`** (not `public`), and both table and column names are **snake_case** in the DB (`CandidateTemplate` → `candidate_template`, `votingClosed` → `voting_closed`). Prisma models/fields keep their camelCase names — the mapping is via `@@map`/`@map` in `prisma/schema.prisma` — so application code is unaffected. The schema name comes from `DATABASE_SCHEMA` (default `televoto`): the server/seed pass it to the `PrismaPg` adapter (`{ schema }`), and `prisma.config.ts` appends it as `?schema=` for the Prisma CLI. `scripts/create_db_televoto_schema.sql` is the hand-written DDL that provisions the schema (and migrates only the `root_credential` secret from a pre-existing `public` schema).
- Generated client lives in `src/generated/prisma/` (custom `output` in `prisma/schema.prisma`) — never hand-edit; regenerate with `npx prisma generate` (also runs automatically via `prebuild`). This is the only thing left under the repo-root `src/` directory — the former React app that used to live there has been fully replaced by `client/`.
- After schema changes, use `npm run db:migrate` (not just `db:push`) to preserve migration history, unless intentionally prototyping.
- `prisma.config.ts` picks the CLI datasource URL from, in order: `PRISMA_CLI_URL` → `DIRECT_DATABASE_URL` → `SUPABASE_DIRECT_URL` → `DATABASE_URL` → `SUPABASE_DATABASE_URL`.
- `scripts/create_db_televoto_schema.sql` provisions the `televoto` schema without touching data (secret migration aside); `scripts/create_db_from_zero.sql` drops and recreates the whole `televoto` schema with demo seed data for local resets; `scripts/bootstrap-db.ts` handles the same programmatic bootstrap (e.g. seeding the root credential from `ROOT_ADMIN_PASSWORD`). All three target the `televoto` schema with snake_case names.

### Angular Material theming
See `client/CLAUDE.md`.
