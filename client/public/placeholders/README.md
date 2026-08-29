# Immagini segnaposto (`client/public/placeholders/`)

Segnaposto SVG generati per valutare **dove inserire immagini al posto di icone/forme**.
Nessun codice dell'app è stato modificato: questi file sono solo materiale di prova.
Le dimensioni nel nome file sono quelle consigliate per l'asset reale.

Servite staticamente da `public/` → raggiungibili a `/placeholders/<file>`.

| # | File | Dimensioni | Dove ha senso usarla | Riferimento nel codice |
|---|------|-----------|----------------------|------------------------|
| 1 | `event-banner_1600x500.svg` | 1600×500 (16:5) | **Banner dell'evento, caricabile dal manager.** In cima alla pagina di voto, nell'header della Classifica in modalità presentazione e sulle card evento in admin/manager. Richiede un nuovo campo (es. `Event.bannerUrl`) + endpoint di upload. | `client/src/app/components/hero-banner/hero-banner.ts` (sopra/dietro il wordmark); `client/src/app/components/score/score.html:48` (header presenter); `client/src/app/pages/admin-shell/admin-shell.html:159` (card evento) |
| 2 | `candidate-photo_400x400.svg` | 400×400 (1:1) | **Ritratto del candidato** al posto della forma SVG colorata nella card di voto, e al posto del pallino colore nella Classifica e nella gestione candidati. Richiede un nuovo campo (es. `Candidate.photoUrl`). | `client/src/app/components/candidate-card/candidate-card.ts:28` (blocco `<svg>` forme); `client/src/app/components/score/score.html:410` (pallino colore riga); `client/src/app/components/event-candidates-manager/event-candidates-manager.html:107` (quadratino colore) |
| 3 | `televoto-logo-horizontal_480x120.svg` | 480×120 | **Logo/wordmark dell'app** al posto del testo "Televoto" + barretta accent. Header pubblico, sidenav admin e manager, gate del codice evento. | `client/src/app/components/header/header.ts:9` (barra + `<h1>`); `client/src/app/pages/admin-shell/admin-shell.html:21`; `client/src/app/pages/event-manager-shell/event-manager-shell.html:33` |
| 4 | `televoto-logo-mark_256x256.svg` | 256×256 (1:1) | Variante **solo simbolo** per spazi stretti (header in `compact()`, apple-touch-icon, PWA). Coerente con `client/public/favicon.svg`. | `client/src/app/components/hero-banner/hero-banner.ts` (modalità `compact`); `client/src/index.html:21` |
| 5 | `auth-gate-backdrop_1920x1200.svg` | 1920×1200 | **Sfondo decorativo** dietro le schede di accesso oggi molto spoglie (inserimento codice evento, area protetta admin/manager/Classifica). | `client/src/app/components/event-code-gate/event-code-gate.ts:16`; `client/src/app/components/protected-page-gate/protected-page-gate.ts:9` |
| 6 | `presenter-stage-idle-backdrop_2560x1440.svg` | 2560×1440 (16:9) | **Sfondo a schermo intero** della schermata d'attesa "Luci in sala" della Classifica in modalità presentazione (proiettata). | `client/src/app/components/score/score.html:221` (blocco Idle) |
| 7 | `empty-state-no-events_400x300.svg` | 400×300 | Illustrazione per l'**empty state "Non c'è ancora nessun evento"** al posto della `mat-icon event_note`. | `client/src/app/pages/admin-shell/admin-shell.html:145` |
| 8 | `empty-state-no-candidates_400x300.svg` | 400×300 | Illustrazione per gli empty state **"Nessun candidato ancora"** e **"Nessun voto ancora registrato"**. | `client/src/app/components/event-candidates-manager/event-candidates-manager.html:103`; `client/src/app/components/score/score.html:283` |
| 9 | `vote-confirmed-illustration_320x320.svg` | 320×320 | Illustrazione di conferma nella schermata **"Grazie, il tuo voto è stato registrato"** (oggi solo testo + `&check;`). | `client/src/app/pages/voting-shell/voting-shell.html:132` |
| 10 | `og-share_1200x630.svg` | 1200×630 | **Immagine anteprima social** (`og:image`), oggi punta al favicon SVG. | `client/src/index.html:22` |
| 11 | `winner-decoration_800x800.svg` | 800×800, sfondo trasparente | Cornice/alloro decorativo **dietro il nome del 1° classificato** nel "winner takeover" della Classifica (oggi solo emoji medaglia). | `client/src/app/components/score/score.html:100` |

## Note

- Tutti gli SVG usano la palette "Palco": fondo `#0a0a0c`/`#111013`, accent oro `#ffb020`, verde conferma `#34d399`.
- Per gli asset reali: banner e foto candidato meglio in JP/WebP (contenuto fotografico); logo, empty state e decorazioni possono restare SVG.
- Il banner evento e la foto candidato sono gli unici che richiedono modifiche a schema DB + API di upload; gli altri sono asset statici che basta referenziare.
