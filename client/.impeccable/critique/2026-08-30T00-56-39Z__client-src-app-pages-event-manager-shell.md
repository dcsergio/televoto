---
target: manager
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-30T00-56-39Z
slug: client-src-app-pages-event-manager-shell
---
# Critique — Event-Manager Shell (`/manager`)

Method: dual-agent (A: design-review sub-agent · B: detector-evidence sub-agent, isolated, parallel). Mode: **Operate** (Studio `.theme-pro`, one live event, time pressure; the manager is single-event by design). First critique scoped to `/manager` alone (prior rounds covered admin + manager jointly).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toolbar status pill + SSE "In ascolto" dot + "aggiornato Ns fa" are strong. But the operator's place in the event arc is never shown, and progress lives below a scroll on Backstage. |
| 2 | Match System / Real World | 3 | Good plain Italian ("Televoto aperto/chiuso", "Codice perso? Rigenera"). One section still wears four names: "Backstage Votazione" / `voting-backstage` / "Controlli televoto" / "Progresso votazioni" / "Classifica parziale". |
| 3 | User Control and Freedom | 3 | Confirms + danger variants + `<details>` + gate "Annulla" everywhere. No cancel for an in-flight "Generazione…"; `handleLoginCancel()` / `handleLogout()` both dump the operator on `/` (public voting). |
| 4 | Consistency and Standards | 4 | Real migration since the joint round: `.status-pill` / `.notice` / `.surface-*` adopted across candidates, judge-code, lifecycle, progress, partial-rankings; judge-token util routed through the one system. Nits: missing eyebrow on `voting-progress-dashboard.html:13`, one hand-rolled surface at `:96`. |
| 5 | Error Prevention | 4 | Candidate fields disabled + lock reason while voting open; destructive confirms name the event; `reissue-all` confirm states the count. Gap: generate `count` max 200 with no batch-size guard. |
| 6 | Recognition Rather Than Recall | 4 | Persistent event identity, self-describing buttons, contextual landing, «nuovo» badge. Gap: Base URL buried in `<details>`; plaintext codes vanish on nav with only a transient banner. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcut for Avvia/Chiudi (the two most time-critical actions), no palette. "Aggiorna" stays manual despite SSE + poll. **No per-token QR/link reprint** for an existing active code. |
| 8 | Aesthetic and Minimalist Design | 2 | `voting-backstage` stacks a danger-zone red box + 4-cell divided stat grid + info panel + warn rows + judge rows + a 3-column accent-flooded ranking — many lit surfaces, one long scroll. Header shows 3 coloured count pills even at 0/0/0. |
| 9 | Error Recovery | 4 | Persistent `.notice notice-danger` with icon; every async handler sets `error()`; specific messages. Gap: `handleCopy` failure routes to the component-top `error()`, far from the row button. |
| 10 | Help and Documentation | 2 | No lifecycle diagram, generated manuals unsurfaced, no first-run/empty orientation. Good inline domain help exists ("le mancate votazioni contano come astensione") but no orientation to the arc. |
| **Total** | | **31 / 40** | **Good — the structural questions (lifecycle invisible, backstage un-designed) are untouched** |

## Design Specificity Verdict

**Start here.** "A regia console in its chrome, a generic dashboard in its busiest body."

**LLM assessment (unanchored).** Authored-for-a-regia-operator, and real: event identity is persistent and load-bearing (toolbar `code — name` + lock/lock_open status pill, tab title `Regia — <name> · <code>`, section synced to `?adminSection=`); `contextualDefaultEventManagerSection()` lands the operator where the evening actually is (no candidates → «Candidati», closed → «Codici Voto», open → «Backstage»), and `hadExplicitSection` correctly suppresses that when a URL pins a section — lifecycle-aware routing; destructive actions are proportionate (`event-lifecycle-controls` toggles `btn-danger`/`btn-primary` by state, `confirmStartVoting()` fires a danger dialog naming the event with "cancellati definitivamente"); the status/notice system is **fully adopted, not half** (`judge-token-status.util.ts` returns `.status-*`, the `emerald/amber/red` family is gone, `event-candidates-manager` migrated, `.theme-pro` re-points `--color-signal-*` so contrast holds on white without ramp-flattening).

Still category-interchangeable: the **lifecycle is still never drawn** — crea → candidati → codici → avvia → chiudi → classifica exists only as nav order and the hidden `contextualDefault` heuristic (heuristic 10 has scored 2 across three critiques). `voting-progress-dashboard` is the **"dashboard SaaS generica" anti-reference DESIGN.md names**: a 4-cell divided stat row, a bare `text-xl` h2 with no eyebrow, stacked hand-rolled `rounded-lg border` boxes. `partial-rankings-panel` **floods the reserved accent** — every score cell is `text-accent-cyan font-display text-lg` across 3 columns × N rows, straight against "L'accento occupa al massimo ~10%". The shell is done; the screen the operator stares at all night is not.

**Deterministic scan.** 23 findings, **0 genuinely actionable** after triage — no design-system drift on this surface. All are: 6 × `design-system-color` at `line:0` (parser reads Angular templates as CSS-less fragments); 14 × `print.service.ts` (the deliberate `@media print` A4 paper stylesheet, which carries a "audits can skip this file" header comment); 2 × `!text-[16px]` on `<mat-icon>` (glyph sizing); 1 × `broken-image` on `qr-code-preview.ts` (Angular `[src]` binding to a generated data-URI). `event-code-gate`, `protected-page-gate`, `shell-toolbar-actions`, `confirm-dialog` are clean.

**Build / lint / tests:** `npm run build` PASS · `npm run lint` (oxlint) PASS · `npm run test:client` PASS (9/9). One pre-existing `qrcode` CommonJS warning, unchanged.

**Visual overlays.** Not available — the Chrome extension is not connected **and** there is no event-manager/root auth path (only the gates would render). Both blockers present. Fallback signal only.

## Overall Impression

Since the joint critiques (24 → 32), the manager **shell** has genuinely arrived: event context, destructive-action signalling, and the status/notice system are all closed P1s, and consistency scores a real 4/40. But every remaining problem sits below the shell, in `voting-backstage` — the one screen an operator looks at for the entire event, and the least-designed view in the product. The single biggest opportunity is to **treat Backstage as a designed surface**: draw the lifecycle the app already computes, calm the accent flood, and give the operator a "what matters right now" instead of a wall of read-only panels.

## What's Working

1. **Lifecycle-aware landing.** `contextualDefaultEventManagerSection()` + the `hadExplicitSection` guard (`event-manager-shell.ts:71,104-115`) — the shell reads event state and puts the operator where the evening actually is, without overriding a shared deep link.
2. **Coherent destructive-action signalling.** `event-lifecycle-controls.html:21-28` state-toggled button style + `.ts:56-70` danger confirm with `detail: "Evento: <name>"`; `openScoreGuarded` centralises the "close voting first" guard so its wording is identical in all three call sites.
3. **The status system is adopted, not just added.** `judge-token-status.util.ts:22` returns `.status-*` (bespoke `emerald/amber/red` gone), `event-candidates-manager` migrated to `.surface-*` / `.notice`, `.theme-pro` re-points `--color-signal-*` so `.status-pill` / `.notice` clear AA on white on their own merits. Both prior P1s closed.
4. **Live-status affordance.** SSE "In ascolto" dot + `lastUpdatedLabel` with its own `nowTick` (`voting-progress-dashboard.ts:64-74`) — the relative "aggiornato Ns fa" is exactly the cadence signal a regia operator needs.

## Priority Issues

### [P1] `partial-rankings-panel` floods the reserved accent
- **Why it matters:** every score cell renders `text-accent-cyan font-display text-lg` (`partial-rankings-panel.html:63`) across three columns × every candidate row, on the operator's primary live screen — a direct violation of "La Regola dell'Unica Luce" (accent ≤ ~10%, one filled accent per view). A wall of amber numerals also destroys the ability to spot the *one* number that changed.
- **Fix:** score numbers → `text-text-primary` tabular; reserve accent for at most the Ponderata leader's figure, or drop it and let position + colour dot carry rank.
- **Suggested command:** `$impeccable colorize` (partial-rankings-panel + voting-backstage composition)

### [P1] The lifecycle is computed and then hidden
- **Why it matters:** crea → candidati → codici → avvia → chiudi → classifica exists only as nav order + `contextualDefaultEventManagerSection()`. No sequence, no "you are here." Heuristic 10 = 2 for the third critique running. A first-time operator has no model of the evening; the app already *knows* the model and won't show it.
- **Fix:** a slim stepper in the manager shell header (or atop Backstage) bound to `candidateCount` / `votingClosed` / vote count — the same inputs `contextualDefault` already consumes.
- **Suggested command:** `$impeccable shape` (manager-shell, lifecycle-as-sequence)

### [P2] No QR / link reprint for an existing active code
- **Why it matters:** only freshly-generated rows render `<app-qr-code-preview>` + URL (`judge-code-manager.html:213-236`); an established active token shows `tokenPreview••••` only. Plaintext is gone after navigation. Losing the A4 mid-event is a real regia failure, and the only recovery — "Rigenera tutti i codici" — invalidates every *other* distributed link too.
- **Fix:** per-row "Mostra QR / link" for active tokens (persist generated URLs in `sessionStorage` for the session, or add a single-token reissue-and-print that doesn't touch siblings).
- **Suggested command:** `$impeccable harden` (judge-code-manager)

### [P2] `voting-progress-dashboard` is the named anti-reference
- **Why it matters:** 4-cell divided stat row (`:36-53`), a bare `text-xl` h2 with no eyebrow (`:13`, breaks "La Regola del Sopracciglio"), stacked hand-rolled `rounded-lg border border-border-glass bg-bg-card/60` boxes (`:96`) instead of `.surface-panel`. DESIGN.md names "dashboard SaaS generica" as an explicit anti-reference; this is the operator's main live screen.
- **Fix:** reduce to one hero figure ("Voti televoto espressi"), demote the rest to hairline rows; add the section eyebrow; migrate the last hand-rolled box to `.surface-panel`.
- **Suggested command:** `$impeccable shape` (voting-progress-dashboard)

### [P2] Judge-code screen: >4 confusable actions, three "regenerate" verbs
- **Why it matters:** Genera / "Rigenera tutti i codici" / "Codice perso? Rigenera" / Revoca / Aggiorna / Valida all co-resident in one scroll (`judge-code-manager.html`). Hick's law + verb collision — under time pressure an operator can fire "Rigenera tutti" thinking it re-shows codes (it invalidates them).
- **Fix:** separate "genera nuovi" from "gestisci esistenti" (steps or sub-tabs); unify verb language; shrink "Valida un codice" to a compact utility, not a co-equal column.
- **Suggested command:** `$impeccable distill` (judge-code-manager)

### [P3] Access-gate accessibility
- **Why it matters:** `protected-page-gate.ts:17` `<input autofocus>` with placeholder-as-label under a `tracking-[0.28em]` uppercase eyebrow; `event-code-gate` input equally label-less; QR `[alt]="label()"` is a slugified filename. Screen-reader users get "edit text" with no name and lose the heading to the autofocus jump.
- **Fix:** real `<label for>` on both inputs, `aria-describedby` the `.notice` error, drop `autofocus` (or move it after the heading is announced), describe the QR ("QR di accesso per <label>").
- **Suggested command:** `$impeccable harden` (gates a11y)

## Persona Red Flags

**Alex — single-event live operator.**
- *Breaks:* no keyboard shortcut for Avvia / Chiudi televoto — the two highest-stakes, most time-sensitive actions of the night are mouse-only *and* share one toggling button position (`event-lifecycle-controls.html:21-28`), so no muscle memory ("the button that said Chiudi is now Avvia, and red").
- *Breaks:* "Aggiorna" persists on `judge-code-manager.html:187` and `voting-progress-dashboard.html:23` despite SSE + a 5s/20s poll — trains the operator to distrust the live view.
- *Breaks:* "Voto pubblico" and "Classifica" both `window.open(..., '_blank')` unconditionally (`event-manager-shell.ts:187,193`) — tabs accrue; nothing refocuses an already-open one.
- *Breaks:* losing the code printout has no graceful recovery (P2).
- *Solid:* the "aggiornato Ns fa" + "In ascolto" cadence; contextual landing saves a click every time.

**Sam — accessibility.**
- *Solid:* nav is `<button mat-list-item>` with `[attr.aria-current]` — full keyboard path; status pills are icon + text, never colour-only; candidate swatches carry `aria-pressed` + `aria-label`; `.theme-pro` re-points `--color-signal-*` so `.status-pill` / `.notice` pass AA on white; `stage-loader` has `role="status"` + `aria-label`; `prefers-reduced-motion` handled globally.
- *Breaks:* both gates — placeholder-as-label, `protected-page-gate` `autofocus` past the heading.
- *Breaks:* QR `<img [alt]="label()">` where label is `"giuria-1"` — not descriptive alt.
- *Weak:* in-flight buttons swap label to "Revoca…" but set no `aria-busy`; `<details>`/`<summary>` "Opzioni avanzate" summary is a small `text-xs` target.

## Minor Observations

- Two "Esci" controls — sidenav `mat-stroked-button` (`event-manager-shell.html:72`) and toolbar `shell-toolbar-actions` logout — duplicative.
- `handleLoginCancel()` and `handleLogout()` both navigate to `/` (public voting entry) — an odd home for a regia laptop; the manager code-gate would be less jarring.
- `judge-code-manager.html:17-28` shows all three count pills (open/warn/danger) even at 0/0/0 — noisy on a fresh event.
- `generatorForm.count` max 200 with no confirm for large batches — one fat-finger prints 200 codes.
- One section, four names ("Backstage Votazione" / "Controlli televoto" / "Progresso votazioni" / "Classifica parziale") — carried over, unaddressed.
- "finalizzato" vs "usato" vs "bloccato il codice" describe the same state in three places; "Qualificata/Popolare" surfaces as "Giuria/Televoto/Pubblico" inconsistently.
- `print.service.ts` correctly carries the "audits can skip this file" header comment.

## Questions to Consider

1. `contextualDefaultEventManagerSection()` computes the operator's place in the lifecycle on every event load — why is that logic worth writing but not worth drawing as a stepper?
2. Three verbs for "make a new code" on one screen (Genera / Rigenera / Rigenera tutti) — does an operator who loses one printed code mid-event understand, before clicking, that "Rigenera tutti" kills every *other* distributed link too?
3. The Backstage is the screen an operator stares at for the entire event — why is it the least-designed view in the product?
4. Avvia / Chiudi televoto share one toggling button with no hotkey — is a live director really expected to mouse-hunt for the single most time-critical control of the night?
5. Both "Esci" and every cancel path drop the regia operator onto the public voting page — is that ever the right destination for someone running the event?
6. The plaintext codes vanish the moment you leave "Codici Voto", with only a transient banner — deliberate security posture, or an unfinished reprint feature?

## Run Notes

- Target slug: `client-src-app-pages-event-manager-shell`. Ignore list: none.
- Assessment independence: A and B ran as isolated parallel sub-agents; B returned first but did not anchor A.
- CLI detector: non-degraded, exit 2, 23 findings, 0 actionable after FP triage. Build + lint + client tests all PASS.
- Browser visibility / overlay injection: skipped — Chrome extension not connected AND no event-manager/root auth. Fallback signal recorded.
- Live server: not started by this run. Temp files: cleaned.
