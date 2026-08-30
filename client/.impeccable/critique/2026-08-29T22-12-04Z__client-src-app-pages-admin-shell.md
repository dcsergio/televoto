---
target: admin and event manager pages
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-29T22-12-04Z
slug: client-src-app-pages-admin-shell
---
# Critique — Admin Shell & Event Manager Shell

Method: dual-agent (A: design-review sub-agent · B: detector-evidence sub-agent, isolated, parallel)
Targets: `client/src/app/pages/admin-shell/` + `client/src/app/pages/event-manager-shell/` and the section components they compose. Mode: **Operate** (Studio / `.theme-pro` light theme; operator working under live-event time pressure).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Admin toolbar shows no selected-event identity or televoto state; selection is a colour-only card border that scrolls off screen. Manager side is fine. |
| 2 | Match System / Real World | 3 | Italian consistent, but "Eventi non archiviati" (double negative) and one section wears five names ("Backstage" / "Backstage Votazione" / "voting-backstage" / "Controlli televoto" / "Progresso votazioni"). |
| 3 | User Control and Freedom | 3 | Confirm dialogs on archive/start/close/reset; gate cancels; "Crea un altro evento" resets cleanly. No cancel for an in-flight "Rigenerazione…". |
| 4 | Consistency and Standards | 2 | Two card systems (`mat-card` vs `.surface-card`), two button systems (`mat-flat-button` "Crea un evento" vs `.btn.btn-primary` "Crea evento" in the *same* section), three eyebrow sizes, the two shells diverge on toolbar content / sidenav width / footer. |
| 5 | Error Prevention | 3 | Candidate edits locked while voting open; `weightPopolare` auto-derived; `maxPreferences` immutability warned. But "Avvia votazione" (full vote wipe + renumber) is styled `.btn-tinted` — the lowest-commitment style for the highest-blast action. |
| 6 | Recognition Rather Than Recall | 2 | Which event the admin toolbar acts on must be recalled. `edit-events` stacks rename + 4 deep-links + archive + manager-password + weights + trimmed-mean in one flat column with three identical "Salva" buttons. |
| 7 | Flexibility and Efficiency | 2 | No keyboard nav (nav items are `<a mat-list-item (click)>` with no `href`), no shortcuts for Avvia/Chiudi, no command palette. Every event opens in an anonymous new browser tab. "Aggiorna" is manual everywhere except backstage. |
| 8 | Aesthetic and Minimalist Design | 2 | Multiple accent-tinted + emerald/amber/red boxes compete per view; "un solo pieno d'accento per vista" / "molto respiro" not honoured. Dashboard stat row lights `text-emerald-300` and `text-accent-cyan` side by side — two lights, against the "Regola dell'Unica Luce." |
| 9 | Error Recovery | 3 | Specific Italian messages, gate errors clear on retry. But a failed "Avvia votazione" leaves only a small `error()` line inside the card plus a transient toast — missable for an operator watching the stage. |
| 10 | Help and Documentation | 2 | Good inline helper text and tooltips, but the lifecycle sequence (crea → candidati → codici → avvia → chiudi → classifica) is never drawn anywhere; the generated manuals aren't surfaced; no first-run orientation. |
| **Total** | | **24 / 40** | **Acceptable — significant improvements needed before operators are happy** |

## Design Specificity Verdict

**Start here.** A generic admin-CRUD composition wearing the Televoto skin — grounded roughly a third of the way.

**LLM assessment (unanchored).** What is genuinely Televoto: the token system is applied (eyebrows, `--color-on-accent`, radius scale, warm hairlines); `.stage-loader` is the one loader everywhere; Space Grotesk + `tabular-nums` on every countable figure; the bold uppercase `TELEVOTO APERTO / CHIUSO` in the manager toolbar; the live backstage ("In ascolto", "aggiornato 5s fa", dual poll cadence, "candidati/giurati incompleti" breakdowns) which answers a regia operator's actual live questions; the contextual landing section that picks the right first screen.

What could be any SaaS back office unchanged: the admin **dashboard** is exactly the pattern DESIGN.md names as an anti-reference — a divided 4-cell stat row plus a uniform card grid with status chips. `mat-sidenav-container` + `mat-nav-list` rail + `mat-card appearance="outlined"` bodies + stacked `field-input` forms, with no control-desk language and no sense of a ceremony being staged behind glass. The destructive live-event actions get *less* ceremony than a generic app would give them. And the admin shell — used by the *more* powerful operator running *more* events — shows *less* event context than the manager shell (no event identity or televoto state in its toolbar at all). An awards/regia product should feel like a broadcast control surface; this feels like an events table with a theme attached.

**Deterministic scan.** 26 findings (4 warning, 22 advisory) against `client/DESIGN.md`: `design-system-color` ×15, `design-system-font-size` ×6, `design-system-radius` ×2, `overused-font` ×1, `design-system-font` ×1, `broken-image` ×1. After stripping false positives the deterministic signal is small and points the same way the review does — consistency drift, not colour chaos:

- **False positives:** all 6 `rgb(0,0,0)` colour findings at `line:0` (the static-HTML engine parses each Angular template as a standalone partial and can't see the `.theme-pro` / `body` cascade — no literal black is authored); `!text-[36px]` / `!text-[16px]` at `admin-shell.html:133,434` (those are `mat-icon` glyph-sizing utilities, not type scale); `broken-image` at `qr-code-preview.ts:20` (an Angular `[src]` binding to a generated data-URI, no static src); `overused-font: "Inter"` (Inter is the project's *documented* body font).
- **Genuine, minor:** eyebrow text ~1px off the `0.625rem` label step (`admin-shell.html:155` `text-[0.7rem]`, `judge-code-manager.html:211` and `qr-code-preview.ts:24` `text-[11px]`) — same "three eyebrow sizes" the review flags. `judge-code-manager/print.service.ts` carries a whole separate light palette (slate/sky Tailwind hexes, `Consolas`, `mm` radii) — a deliberate `@media print` handout stylesheet, out of the on-screen system but worth a human glance.
- Clean: `shell-toolbar-actions`, `protected-page-gate`, `event-code-gate`.

**Visual overlays.** Not available. The routes are password-gated and render nothing past the gate without a running Express backend + PostgreSQL + a signed event-manager token; no dev server was listening. Fallback signal only.

## Overall Impression

The bones are sound and the plumbing is genuinely good — the live backstage, the create-event handoff, the contextual landing. But the two shells read as a re-skin, not a design, and the visual hierarchy actively points operator confidence the wrong way: the single most destructive action on the page ("Avvia votazione", a full vote wipe) is the quietest button, while the milder "Azzera classifica" gets a red danger box. The single biggest opportunity is to stop treating these as CRUD screens and design them as a **regia control surface** — persistent event context, the lifecycle drawn as a sequence, destructive actions signalled in proportion to their blast radius.

## What's Working

1. **Post-create confirmation panel** (`admin-shell.html:205-239`) — turns "record created" into a guided handoff: big `tabular-nums` code, copy-with-checkmark, explicit next-step CTAs ("Aggiungi candidati" / "Vai alla gestione evento"). The emotional high of both pages.
2. **Live backstage status** (`voting-progress-dashboard`) — "In ascolto" + "aggiornato Ns fa" + dual poll cadence (5s open / 20s closed) + SSE debounce, plus the "candidati/giurati con voti incompleti" lists. Honest, low-anxiety, and answers the operator's real live questions.
3. **Contextual landing section** (`event-manager-shell.util.ts:36-43`) — no candidates → Candidati; voting open → Backstage. Removes a navigation decision exactly when the operator is task-focused. Also: invalid-scoring-config prevention (trimmed-mean/weight fields hidden for PREFERENCE events, `weightPopolare` disabled and auto-derived).

## Priority Issues

### [P0] "Avvia votazione" is under-signalled versus its blast radius
- **Why it matters:** during a live event an accidental start wipes every vote and renumbers candidates. `event-lifecycle-controls.html:14` renders it as `.btn-tinted` (lowest-commitment style); the confirm uses a gold `.btn-primary` "Avvia" with no event name and no irreversibility language — while the *lesser* "Azzera classifica" gets the loud red "Zona pericolosa" box. Signalled danger is inversely proportional to actual danger.
- **Fix:** give the primary lifecycle button state-specific styling — "Avvia votazione" as a deliberate/danger action with its own confirm dialog (event name in the body, red confirm button, "I voti già espressi saranno cancellati definitivamente"); reserve gold `.btn-primary` for the non-destructive "Chiudi televoto". Consider splitting first-run ("Apri televoto") from re-run ("Ricomincia da capo").
- **Suggested command:** `$impeccable harden` (event-lifecycle-controls, destructive-action signalling)

### [P1] Admin shell has no persistent event context; the toolbar acts on an invisible selection
- **Why it matters:** root runs multiple events in parallel. The admin toolbar (`admin-shell.html:60-81`) is Refresh + public-view buttons `[disabled]="!selectedEvent()"` with no indication of *which* event; selection is only a cyan card border (`:149`), and `handleManageEvent` mutates the selection as a side effect of a "Gestisci" click. Opening the wrong event's public Classifica mid-show is a real incident.
- **Fix:** persistent event identifier in the admin toolbar (code + short name + televoto-state chip), mirroring `event-manager-shell.html:83-95`; make selection explicit and give it a text/icon/`aria-current` cue, not colour alone; put the target event name in the public-view button tooltips.
- **Suggested command:** `$impeccable shape` (admin-shell, event-context persistence)

### [P1] "Modifica Eventi" is a ~12-control wall with three identical "Salva" buttons
- **Why it matters:** `admin-shell.html:386-547` stacks rename + 4 deep-links + archive + manager-password rotation + two weight fields + trimmed-mean toggle + % field in one flat `space-y-3` column, with visually identical `.btn-tinted.btn-sm` "Salva" at `:428`, `:462`, `:532`. High mis-click risk, high scan cost, and it equates routine (rename) with high-stakes (manager lockout, scoring weights that change results mid-event). The manager-password field here has **no confirm input** — unlike the root password and the clone dialog — so one typo locks a manager out.
- **Fix:** split into eyebrowed sub-panels or an accordion — "Anagrafica" / "Sicurezza" (with a password-confirm field + "dovrai comunicare la nuova password al manager") / "Calcolo punteggio" — each with one scoped Salva. Consider gating weight edits while `!votingClosed`, like candidate edits.
- **Suggested command:** `$impeccable distill` (admin-shell, edit-events section)

### [P2] Two parallel component languages, often adjacent
- **Why it matters:** admin sections + `event-candidates-manager` use `mat-card appearance="outlined"` + `mat-*-button`; `event-lifecycle-controls` / `judge-code-manager` / `voting-progress-dashboard` / `partial-rankings-panel` use `.surface-card` / `.btn*`. `admin-shell.html:138` vs `:338` is both in one section. Inconsistent radius, elevation, focus and disabled treatment; the regia surface reads as two half-migrated designs and undercuts "stesso impianto." The detector's radius/font drift and `judge-code-manager.html:6`'s resting `shadow-card` (which the "Piatto-di-Default" rule forbids) are symptoms of the same split.
- **Fix:** make the hand-rolled primitives (`.surface-card`, `.btn*`, `.field-input`) canonical for content surfaces — they encode the tokens — and keep Material only for genuinely interactive chrome (dialog, select, snackbar, sidenav, tooltip).
- **Suggested command:** `$impeccable harden` (admin-shell + manager-shell, component-language consistency)

### [P2] Status-colour semantics are ad hoc
- **Why it matters:** `event-lifecycle-controls.html:31` uses `border-red-500/25 bg-red-500/10 text-red-200`; `judge-code-manager.html:16-27` emerald/amber/red boxes; `voting-progress-dashboard` `text-emerald-300`/`text-amber-300`; the manager toolbar `text-emerald-400` (a *Palco* hex, AA on white not guaranteed); edit-events chip `!text-emerald-200`; error boxes elsewhere use `accent-coral`. Same "danger" or "open" meaning, several different token families — bypassing the `signal-open/warn/danger` layer DESIGN.md defines precisely to keep status AA and never colour-only. The detector's 15 `design-system-color` hits (once the parser false positives are removed, mainly `print.service.ts` and these status tints) agree.
- **Fix:** route every status surface through the `signal-*` tokens (or `.status-open` / `.status-warn` / `.status-danger` helpers), each paired with an icon or a text label so meaning is never colour-only.
- **Suggested command:** `$impeccable colorize` (components, status-token consistency)

## Persona Red Flags

**Alex (regia power user / live operator).**
- Toolbar public-view buttons fire on an invisible selection (`admin-shell.html:73-80`).
- Every workspace opens in an anonymous new "Televoto" browser tab (`admin-shell.ts:339`); 3 events = 3 indistinguishable tabs, no cross-tab state.
- No keyboard path: nav items are `<a mat-list-item (click)>` with no `href` (both shells); no shortcut for Avvia/Chiudi, no palette.
- "Avvia votazione" and "Chiudi televoto" share one toggling button position — under pressure Alex clicks the location, not the label.
- `savedFlash` auto-clears after 2.5s — glance away and you miss whether the weight save landed.
- "Aggiorna" is manual on the dashboard, candidates, and codici; only the backstage self-updates.

**Sam (accessibility).**
- Section nav not keyboard-operable as links — `<a mat-list-item>` with `(click)` and no `href`/`role`; keyboard/AT users may not reach section switching in either shell.
- Selected-event state is colour-only (`[class.!border-accent-cyan]`, `admin-shell.html:149`) — no text, icon, or `aria-current`.
- Dashboard archive control is `mat-icon-button` with `matTooltip` but no `aria-label` (`admin-shell.html:172-180`) — icon-only, tooltip-only name.
- Manager toolbar status uses `text-emerald-400` (Palco hex, not a Studio signal token) — contrast on white not guaranteed AA. 10px `text-text-muted` eyebrows are borderline per DESIGN.md's own contrast note.
- `<input autofocus>` in the gate with a `tracking-[0.28em]` uppercase eyebrow — some screen readers spell spaced/upper text letter-by-letter.
- Good: `stage-loader` has `role="status"` / `aria-label`; colour swatches carry `aria-pressed`; `<details>` disclosure is native.

**Casey (mobile regia)** — not a stated scenario (admin/manager are laptop/desktop per PRODUCT.md), but the shells *do* ship a handset sidenav. If used: `hidden sm:inline` hides all three toolbar action labels below `sm` leaving three ambiguous icons; the `edit-events` wall and `judge-code-manager`'s two-form `lg:grid` become endless scroll; the manager toolbar crams event name + big status string + actions with no wrap plan. Low priority.

## Minor Observations

- `partial-rankings-panel.html:16` guards on `popularVoteMode !== 'SINGLE'` — `'SINGLE'` is not a current enum value (`NUMERIC | PREFERENCE`); stale/dead guard.
- `confirm-dialog.ts:16` and `clone-event-dialog.ts:23` hardcode `shadow-2xl` (cool `#000`-based) instead of the warm shadow token.
- The regia rail wordmark (`admin-shell.html:21`, `event-manager-shell.html:44`) uses `neon-text` + `tracking-wider` but omits the brand accent bar (`h-4 w-1`) the public header carries — regia loses the mark.
- Eyebrow sizing: `text-sm` / `text-xs` / `text-[10px]` for one role; spec is `0.625rem`.
- "Eventi non archiviati" → "Eventi attivi". Inline pluralization `archiviat{{ 'o' : 'i' }}` while a `pluralize()` util exists elsewhere.
- `admin-shell.html:54` shows `ver. 1.0`; the manager rail shows no version — inconsistent footer.
- "opens in new tab" is signalled by a `↗` glyph in one place and a Material `open_in_new` icon in another.
- No empty state when deep-linking to `edit-events` with zero events — a disabled select + "Seleziona prima un evento."
- `judge-code-manager/print.service.ts` — deliberate print stylesheet with its own palette; fine, but flag it as intentionally-outside-system in a comment so future audits skip it.

## Questions to Consider

1. The manager shell shows televoto state, event identity, and a live backstage. Why does the admin shell — used by the operator juggling *more* events — show *less* context, not more?
2. The lifecycle (crea → candidati → codici → avvia → chiudi → classifica) *is* the product. Why is it never drawn as a sequence anywhere in the regia — only inferable from nav order and a hidden landing heuristic?
3. Is "Avvia votazione" the right model at all? It's really "wipe everything and (re)open." Should first-run and re-run be different actions with different guardrails?
4. Two card systems, two button systems, three eyebrow sizes — is `.theme-pro` a design system on these pages, or a re-skin of whatever each component happened to ship with?
5. Root opens each event in its own browser tab — the primary multi-event UX for a live evening. Should there be one regia surface with an event switcher instead (the cross-event restriction only binds *managers*)?
6. The dashboard is precisely what the brief warns against ("dashboard SaaS generica"). Does admin need a dashboard — or a "stasera in onda" board showing only the 2-3 events actually running, with live state and nothing else?

## Run Notes

- Target slug: `client-src-app-pages-admin-shell` (covers both shells; manager shell reviewed jointly).
- Ignore list: none (`.impeccable/critique/ignore.md` absent).
- Assessment independence: A (design review) and B (detector) ran as isolated parallel sub-agents; B returned first but did not anchor A (A ran fully isolated).
- CLI detector: ran non-degraded after the sub-agent installed the HTML-parser deps into the skill's `node_modules`; exit 2, 26 findings, ~6 genuine after false-positive triage.
- Browser visibility / overlay injection: skipped — routes are auth-gated and need Express + PostgreSQL; no dev server running. Fallback signal recorded.
- Live server: not started. Temp files: cleaned.
