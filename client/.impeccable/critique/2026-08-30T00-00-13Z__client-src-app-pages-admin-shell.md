---
target: admin and event manager pages
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-30T00-00-13Z
slug: client-src-app-pages-admin-shell
---
# Critique (re-run) — Admin Shell & Event Manager Shell

Method: dual-agent (A: design-review sub-agent · B: detector-evidence sub-agent, isolated, parallel)
Targets: `client/src/app/pages/admin-shell/` + `client/src/app/pages/event-manager-shell/` and the section components they compose. Mode: **Operate**. Baseline: 24/40 (2026-08-29).

## Design Health Score

| # | Heuristic | Base | Now | Key Issue (current) |
|---|-----------|------|-----|---------------------|
| 1 | Visibility of System Status | 2 | 3 | Admin toolbar now shows event identity + a lock/lock_open status pill + titled tab. Still: no cross-event "what's live now" view; `savedFlash` auto-clears at 2.5s; "Aggiorna" manual on dashboard/candidates. |
| 2 | Match System / Real World | 3 | 3 | "Eventi non archiviati" → "Eventi attivi" fixed. One section still wears four names: "Backstage Votazione" / `voting-backstage` / "Controlli televoto" / "Progresso votazioni". |
| 3 | User Control and Freedom | 3 | 3 | Confirms + danger variants + password-confirm fields + cancel paths everywhere. Still no cancel for an in-flight "Rigenerazione…" / "Creazione…". |
| 4 | Consistency and Standards | 2 | 3 | Dual card/button systems resolved *inside the admin shell*. But `event-candidates-manager` still `mat-card` + `accent-coral` box; `getJudgeTokenStatusClass` still emerald/amber/red badges; eyebrow sizing still varies (`text-sm` / `text-xs` / `text-[0.625rem]`) across components. |
| 5 | Error Prevention | 3 | 4 | "Avvia votazione" now danger-styled + danger confirm naming the event with "cancellati definitivamente". Manager-password gained a confirm field. Gap: weight edits still not gated while voting is open. |
| 6 | Recognition Rather Than Recall | 2 | 4 | Both baseline complaints fixed: toolbar shows which event is acted on; the three identical "Salva" are now "Salva nome" / "Aggiorna password manager" / "Salva pesi e calcolo" in three labelled panels. |
| 7 | Flexibility and Efficiency | 2 | 3 | Nav keyboard-operable (`<button mat-list-item>`); admin selection deep-linkable/shareable. Still no Avvia/Chiudi shortcut, no palette; workspaces still open as separate tabs. |
| 8 | Aesthetic and Minimalist Design | 2 | 3 | Stat row reduced to one accent; pills unify status. But `voting-backstage` still stacks 3+ lit surfaces in one scroll; dashboard still the SaaS-generic pattern. |
| 9 | Error Recovery | 3 | 4 | Errors now render as persistent full-width `.notice notice-danger` instead of a missable inline line + transient toast. |
| 10 | Help and Documentation | 2 | 2 | Lifecycle sequence still undrawn; generated manuals still not surfaced; no first-run orientation. edit-events gained one helper line. |
| **Total** | | **24** | **32 / 40** | **Acceptable → Good; structural questions untouched** |

## Design Specificity Verdict

**Start here.** Moved from "a generic admin-CRUD composition wearing the Televoto skin" to **"a regia console in its chrome, still a CRUD app in its body."**

**LLM assessment (unanchored).** What moved: the shells now read as authored for a live operator — event identity is persistent in the admin toolbar (`admin-shell.html:74-100`), synced to a deep-linkable `?eventCode=`, and the browser tab title carries the event name/code. The single worst baseline inversion — the most destructive action being the quietest button — is fixed: `event-lifecycle-controls` toggles `btn-danger`/`btn-primary` by state, `confirmStartVoting()` fires a `confirmVariant:'danger'` dialog with the event name and "cancellati definitivamente" copy, and gold `btn-primary` is reserved for the non-destructive "Chiudi televoto". `.status-pill` / `.notice` routed through `signal-*` tokens are genuine system-building. `edit-events` is decomposed into three labelled `.surface-panel` forms with self-describing Salva buttons. Dual card / button systems are resolved inside the admin shell; both rails got the accent bar, `ver. 1.0`, and keyboard-operable nav.

What didn't move: the admin **dashboard is still the exact anti-reference DESIGN.md names** — a divided 4-cell stat row + a uniform card grid with status chips; no "stasera in onda" reduction. The **lifecycle that *is* the product** (crea → candidati → codici → avvia → chiudi → classifica) is still never drawn — it exists only as nav order and a hidden heuristic. And the **composed section components lag the shells**: `event-candidates-manager` is still a `mat-card` with a hand-rolled `accent-coral` error box; `judge-token-status.util.ts` still returns `emerald/amber/red` badges; `judge-code-manager` and `voting-progress-dashboard` still stack hand-rolled tinted callout boxes. The live backstage — the operator's main screen — is now the least "designed" view in the product. The specificity ceiling is now set by the components the shells compose, not the shells.

**Deterministic scan.** 26 findings (same count as baseline), but **0 genuinely actionable** after false-positive triage — the fix round did not introduce real design-system drift:
- 7 × `design-system-color` at `line:0` — the parser reads each Angular template as a CSS-less fragment and assumes `rgb(0,0,0)`. Not real.
- 14 × `print.service.ts` — the deliberate `@media print` paper stylesheet (its own slate/sky palette, `mm` radii, `Consolas`), now carrying a header comment telling audits to skip it.
- 1 × `broken-image` on `qr-code-preview.ts` — an Angular `[src]` binding to a generated data-URI.
- 3 × `design-system-font-size` — all `!text-[NNpx]` on `<mat-icon>` (glyph sizing, not type scale). Down 2 from baseline.
- 1 × NEW `cramped-padding` at `partial-rankings-panel.html:0` — the flagged row *does* carry `px-3 py-2`; the detector isn't resolving the Tailwind utilities in the fragment. Parser false positive.

**Build / lint / tests:** `npm run build` PASS · `npm run lint` (oxlint) PASS, clean · `npm run test:client` PASS (9/9). One pre-existing `qrcode` CommonJS warning, unchanged.

**Visual overlays.** Not available — the Chrome extension is not connected, and the section components sit behind event-manager auth (backend + DB are up, but no credentials). Fallback signal only.

## Overall Impression

The fix round did what it set out to do: **every baseline P0/P1 is closed**, the score moved 24 → 32, and the shells now feel like a control surface rather than a table. The work is real system-building, not a re-skin — `.status-pill` and `.notice` are adopted, not just added.

But the gains stop at the shell boundary. The three biggest *un*addressed items are all structural, not cosmetic: the dashboard is still the anti-reference landing view, the lifecycle is still invisible, and the two busiest components an operator actually stares at during a live event (`judge-code-manager`, `voting-progress-dashboard`) still run the old colour families. The single biggest opportunity now is to **push the system into those composed components and reframe the admin landing** as "what's live tonight."

## What's Working

1. **Destructive-action signalling is now coherent and proportionate** (`event-lifecycle-controls.html:24` + `.ts:56-70`): state-specific button style, danger confirm with `detail: "Evento: <name>"` and irreversibility copy; gold `btn-primary` reserved for the safe "Chiudi televoto". Closes baseline P0.
2. **Persistent, deep-linkable event context** (`admin-shell.html:74-100`): labelled "Azioni rapide su" `<mat-select>` + status pill (icon + text + `aria-label`), synced to `?eventCode=`, with dashboard cards carrying `aria-current`, an "Attivo" pill, and a "Rendi attivo" action. Closes baseline P1.
3. **`edit-events` decomposition** into Anagrafica / Sicurezza / Calcolo punteggio — three `.surface-panel` forms, each a self-describing single Salva; Sicurezza gained a password-confirm field + mismatch warning. Closes baseline P1 #2.
4. **`.status-pill` / `.notice` primitives** routed through `signal-*` tokens, adopted across both shells and `event-lifecycle-controls` — real system-building.

## Priority Issues

### [P1] Composed section components not migrated to the primitive system
- **Why it matters:** the fix round converted the shells and left `event-candidates-manager.html` behind — still `<mat-card appearance="outlined">` (`:1`), a hand-rolled `border-accent-coral/40 bg-accent-coral/10` error box (`:9`), `text-emerald-300` / `text-amber-200` status text. Within `/manager`, Candidati renders as a Material card while Backstage renders as `.surface-card` — a visible half-migration in the operator's own workspace.
- **Fix:** wrapper → `.surface-card`, inner blocks → `.surface-panel`, error → `.notice notice-danger`, status text → `signal-*`.
- **Suggested command:** `$impeccable harden` (event-candidates-manager)

### [P1] Judge-token status still bypasses the status system
- **Why it matters:** `judge-token-status.util.ts:16-21` returns `border-amber-500/… text-amber-200` / `…red…` / `…emerald…` badges, rendered at `judge-code-manager.html:133,209` and `voting-progress-dashboard.html:104`, plus hand-rolled amber callouts in both. A second badge shape and colour family compete with `.status-pill` in the two busiest components — and their AA holds **only** because `.theme-pro` flattens those ramps; strip that override and they fail.
- **Fix:** `getJudgeTokenStatusClass` returns `.status-open/.warn/.danger/.neutral`; callouts become `.notice-warn` / `.notice-ok`.
- **Suggested command:** `$impeccable colorize` (judge-code-manager + voting-progress-dashboard)

### [P2] The live backstage stacks competing tint
- **Why it matters:** `voting-backstage` composes `event-lifecycle-controls` (red "Zona pericolosa") + `voting-progress-dashboard` (accent-cyan info box `:56` + amber boxes `:78` + amber judge rows) + `partial-rankings-panel` (`text-accent-cyan` on every score, medal emojis). Three-plus lit surfaces in one scroll — against "un solo pieno d'accento per vista / molto respiro", on the operator's primary live screen.
- **Fix:** demote info boxes to hairline `.surface-panel`, one accent figure per panel, drop the medal emojis (a consumer-poll tell per DESIGN.md's anti-references).
- **Suggested command:** `$impeccable distill` (voting-backstage composition)

### [P2] The lifecycle is still never drawn
- **Why it matters:** crea → candidati → codici → avvia → chiudi → classifica exists only as nav order + `contextualDefaultEventManagerSection()`. No sequence, no "you are here", manuals unsurfaced, no first-run orientation. Heuristic 10 unchanged at 2.
- **Fix:** a slim stepper in the manager shell header (or top of Backstage) reflecting event state.
- **Suggested command:** `$impeccable shape` (manager-shell, lifecycle-as-sequence)

### [P2] Admin dashboard is still the "dashboard SaaS generica" anti-reference
- **Why it matters:** divided 4-cell stat row (`admin-shell.html:143-163`) + uniform card grid with status chips (`:188-259`). The fix round trimmed the stat row to one accent but not the pattern; no reduction to the 2-3 events actually running.
- **Fix:** reframe the landing view as a running-events board — live state, nothing else — with the full grid a secondary tab.
- **Suggested command:** `$impeccable shape` (admin-shell dashboard)

### Regressions the fix round introduced
- The toolbar `<mat-select>` needed a bespoke CSS patch (`styles.scss` `.admin-toolbar-event`) to fit a `mat-toolbar`; below `sm` the status pill hides (`admin-shell.html:92`) so mobile admin sees the selector but not the state.
- ~~`confirm-dialog.ts` doc comment claimed the danger variant "adds a warning banner above the message" — it only adds a left icon chip.~~ Fixed during this critique.
- The three edit-events panels still look alike at a glance (same eyebrow colour, same `.btn-tinted.btn-sm`) — decomposed but not visually differentiated.

## Persona Red Flags

**Alex (regia power user).**
- *Resolved:* keyboard nav; invisible toolbar selection; tab differentiation; destructive-action under-signalling.
- *Persists:* no Avvia/Chiudi shortcut, no palette; "Aggiorna" manual on dashboard + candidates; `savedFlash` auto-clears at 2.5s; each workspace still a separate tab — no single regia surface with an event switcher (the cross-event restriction only binds *managers*).
- The primary lifecycle button still shares one toggling position — now better differentiated (gold vs brick, `lock` vs `restart_alt`) but position-stable under pressure.

**Sam (accessibility).**
- *Resolved:* nav keyboard operability; selected-event no longer colour-only (`aria-current` + "Attivo" pill; toolbar pill icon + text + `aria-label`); dashboard archive button `[attr.aria-label]="'Archivia ' + ev.name"`; the darkened `--color-text-muted` (~5.7:1) means the 10px eyebrows now clear AA.
- *Persists:* `protected-page-gate.ts` still `<input autofocus>` under a `tracking-[0.28em]` uppercase eyebrow; gate errors still bare `text-accent-coral` / `text-amber-300`, not `.notice`.
- *Partial:* judge-token badges carry text labels (not colour-only) but a different colour family than `.status-pill`, and their AA holds only via the `.theme-pro` ramp flattening.
- *Nit:* dashboard card uses `aria-current="true"` where `page` (as on the nav) is conventional.

**Casey (mobile regia)** — still not a stated scenario. Below `sm` the toolbar status pill and all three action-button captions hide; the `voting-backstage` / `judge-code-manager` two-column grids become long scroll. Low priority.

## Minor Observations

- Fixed since baseline: dead `'SINGLE'` guard; `shadow-lift` warm token on the two dialogs; "Eventi attivi" copy; `pluralize()` adopted; `ver. 1.0` on both rails; wordmark accent bar; `↗` glyph → `open_in_new`.
- `event-candidates-manager.html:19` — `currentStatus()` toggles `text-accent-cyan` (closed) vs `text-emerald-300` (open); "aperto" is `signal-open` everywhere else and "closed" isn't an accent-worthy state.
- Eyebrow sizing across composed components still varies: `text-[0.625rem]` (`judge-code-manager.html:9`) vs `text-sm uppercase` (`partial-rankings-panel.html:11`) vs `text-sm font-semibold uppercase` (`voting-progress-dashboard.html`).
- `print.service.ts` now carries the "intentionally outside system" comment (added in the fix round; the sub-agent's copy predates it).

## Questions to Consider

1. The admin toolbar now shows event identity — but the **dashboard, the first screen, still opens on an all-events CRUD grid.** If the operator walks in asking "what's live and is it healthy?", why isn't that the landing view?
2. Three sub-panels in edit-events, each with its own Salva and transaction — **actually safer, or just triple the "did that save?" checks?**
3. `contextualDefaultEventManagerSection()` already encodes the lifecycle. **Why compute it and hide it** instead of drawing it as a stepper?
4. `.status-pill` unified the shells, but `getJudgeTokenStatusClass` and every callout in the two busiest components kept their old ramps. **Is the system adopted, or just added?**
5. Medal emojis in `partial-rankings-panel`, on a regia dashboard whose DESIGN.md names "app di sondaggi consumer (emoji)" as an anti-reference — deliberate warmth, or a leak?
6. Root still opens every event in its own tab; the fix round titled the tabs. **Is that solving the multi-event evening, or making the workaround tolerable enough that the real fix never ships?**

## Run Notes

- Target slug: `client-src-app-pages-admin-shell` (covers both shells).
- Ignore list: none (`.impeccable/critique/ignore.md` absent).
- Assessment independence: A and B ran as isolated parallel sub-agents; B returned first but did not anchor A (A ran fully isolated, aware only that a prior pass scored 24/40).
- CLI detector: non-degraded, exit 2, 26 findings, 0 actionable after FP triage. Build + lint + client tests all PASS.
- Browser visibility / overlay injection: skipped — Chrome extension not connected and section components need event-manager auth. Fallback signal recorded.
- Live server: not started by this run (a dev server was already listening). Temp files: cleaned.
