---
name: Televoto
description: Sistema di voto in diretta per eventi dal vivo — un palco per il pubblico, una regia per chi organizza.
colors:
  stage-black: "#09090b"
  stage-raised: "#0f0f12"
  stage-card: "#141417"
  stage-card-hover: "#1a1a1f"
  stage-card-selected: "#201d16"
  accent-stage-gold: "#ffb020"
  accent-desk-amber: "#b45309"
  champagne-victory: "#f2c86a"
  on-accent-stage: "#1a1206"
  on-accent-desk: "#ffffff"
  ink-primary: "#f4f4f5"
  ink-secondary: "#a1a1aa"
  ink-muted: "#71717a"
  hairline: "rgba(255, 255, 255, 0.08)"
  border-lit: "rgba(255, 176, 32, 0.55)"
  paper-white: "#fbfbfc"
  paper-raised: "#f1f2f4"
  paper-card: "#ffffff"
  studio-ink-primary: "#16181d"
  studio-ink-secondary: "#55585f"
  studio-ink-muted: "#63666e"
  studio-hairline: "rgba(18, 20, 24, 0.10)"
  signal-open: "#3f9366"
  signal-warn: "#c9923f"
  signal-danger: "#df5b48"
  signal-danger-studio: "#c11919"
  signal-open-studio: "#05664a"
  signal-warn-studio: "#b45309"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 7vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.2em"
  numeric:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
    fontFeature: "'tnum'"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  lg: "0.75rem"
  xl: "0.875rem"
  "2xl": "1rem"
  "3xl": "1.25rem"
spacing:
  gutter: "1rem"
  card: "1rem"
  panel: "1.5rem"
  section: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-stage-gold}"
    textColor: "{colors.on-accent-stage}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.champagne-victory}"
    textColor: "{colors.on-accent-stage}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
  button-danger:
    backgroundColor: "#241412"
    textColor: "#d68d82"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
  input-field:
    backgroundColor: "{colors.stage-raised}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  input-field-focus:
    backgroundColor: "{colors.stage-raised}"
    textColor: "{colors.ink-primary}"
  card-surface:
    backgroundColor: "{colors.stage-card}"
    rounded: "{rounded.2xl}"
    padding: "1.5rem"
  chip:
    backgroundColor: "{colors.stage-card-hover}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "0.125rem 0.5rem"
  score-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.xl}"
    size: "3.25rem"
  score-button-active:
    backgroundColor: "{colors.accent-stage-gold}"
    textColor: "{colors.on-accent-stage}"
    rounded: "{rounded.xl}"
    size: "3.25rem"
---

# Design System: Televoto

## Overview

**Creative North Star: "La Regia e il Palco"**

Televoto è una sola produzione televisiva vissuta da due lati del vetro. Il **Palco** (tema scuro, di default — `/` voto e `/score` Classifica) è ciò che va in onda: un fondo nero-scena, superfici solide con bordo a filo di lama, un'unica luce d'oro puntata e una tipografia da manifesto per il momento della premiazione. La **Regia** (tema chiaro "Studio", `.theme-pro` su `/admin` e `/manager`) è il banco dietro le quinte: carta chiara, ordine, tutto leggibile a colpo d'occhio mentre l'evento corre. Stessi token, stessi componenti, stesso impianto — cambia solo il lato del vetro da cui guardi.

Il sistema è **cerimoniale quando serve, trattenuto ovunque altro**. Sul Palco i momenti chiave (il vincitore, la finale a due, il terzo classificato) sono trattati come rivelazioni: numero che atterra, count-up sul punteggio, alone caldo attorno al vincitore. Fuori da quei beat, tutto si fa strumento: un solo pieno d'accento per vista, stati appena percettibili, molto respiro. Il colore non porta informazione da solo, l'accento non è mai decorazione diffusa, e i nomi dei token legacy ("neon", "glass", "gradient") **non descrivono più il look** — non c'è bagliore elettrico, non c'è vetro, non c'è gradiente sul testo.

L'accento — **oro `#ffb020` sul Palco, ambra `#b45309` nello Studio** — è l'unica cosa accesa in campo. La sua rarità è il punto.

**Key Characteristics:**
- Due temi, un'anima: "Palco" scuro broadcast (default), "Studio" chiaro da regia (`.theme-pro`), stesso token set ri-puntato.
- Un solo accento riservato per tema, usato con parsimonia; l'effetto viene da contrasto e tipografia.
- Superfici piatte a riposo con bordo hairline; profondità per stratificazione tonale, ombra calda solo come risposta a uno stato.
- Space Grotesk per display e numeri (tabular), Inter per il testo; ogni sezione si apre con un'etichetta-sopracciglio da 10px in maiuscoletto spaziato.
- Grana di pellicola fissa al 4% sul Palco per rompere la piattezza vettoriale.
- Anti-riferimenti confermati: estetica neon/gaming, app di sondaggi consumer, dashboard SaaS generica.

## Colors

Una scena quasi nera con una sola luce calda; nello Studio la stessa luce, calmata per la carta. Ruoli identici tra i due temi — cambia solo il valore.

### Primary

- **Oro da Ribalta** (`#ffb020`, Palco): l'unico accento del tema scuro. Bottone primario pieno, punteggio selezionato, anello di focus, barra del progresso, riga dell'equalizzatore del loader, bordo della card selezionata. Ink sopra questo pieno: **Bruno Proiettore** (`#1a1206`), mai un nero puro.
- **Ambra da Tavolo** (`#b45309`, Studio): lo stesso ruolo nel tema chiaro (`.theme-pro`), l'oro di marca abbassato per reggere il contrasto AA sulla carta bianca. Ink sopra: bianco (`#ffffff`).

### Secondary

- **Champagne della Vittoria** (`#f2c86a` Palco / `#a16207` Studio): il tono "victory", volutamente distinto dall'oro interattivo così il beat del vincitore non si legge come un elemento cliccabile. Solo nel takeover della Classifica: eyebrow "Vincitore", bordo della card campione, hover del bottone primario.

### Tertiary (segnali di stato)

Ramp caldi e desaturati, così il verde "aperto" non stona vicino all'oro di scena. Sul Palco si usano come testo/tinta su fondo scuro; nello Studio sono appiattiti a un unico passo scuro che tiene AA sia su bianco sia sulla propria tinta /10–/15.

- **Segnale Aperto** (`#3f9366` Palco / `#05664a` Studio): televoto aperto, evento attivo, esito "salvato".
- **Segnale Avviso** (`#c9923f` Palco / `#b45309` Studio): stato archiviato, cautele; tirato verso l'ocra/miele per non confondersi con l'accento di marca.
- **Segnale Pericolo** (`#df5b48` Palco / `#c11919` Studio): errori, danger zone (azzera classifica, revoca). Un mattone caldo, non un rosso puro — legacy `accent-coral`.

### Neutral

**Palco** — **Nero Scena** (`#09090b`, fondo pagina, con un alito radiale d'oro al 7% dietro l'header), **Fondale Rialzato** (`#0f0f12`, sidenav, input), **Card di Scena** (`#141417`), **Card Hover** (`#1a1a1f`), **Card Selezionata** (`#201d16`, un bruno appena tiepido). Testo: **Inchiostro** (`#f4f4f5`), **Inchiostro Secondario** (`#a1a1aa`), **Inchiostro Muto** (`#71717a`). Bordi: hairline bianco all'8% (`rgba(255,255,255,0.08)`); **Bordo Illuminato** (`rgba(255,176,32,0.55)`) solo su superfici selezionate/vincenti.

**Studio** — **Carta** (`#fbfbfc`), **Carta Rialzata** (`#f1f2f4`), **Carta Card** (`#ffffff`), **Carta Selezionata** (`#fbf3e8`). Testo: `#16181d` / `#55585f` / `#63666e` (l'ultimo scurito a ~5.7:1: sotto AA non passava per le etichette da 10–12px). Bordi: `rgba(18,20,24,0.10)`.

### Named Rules

**La Regola dell'Unica Luce.** L'accento occupa al massimo ~10% di qualunque schermata. Un solo bottone pieno d'accento per vista; tutto il resto è tinted, ghost o testo. Se due elementi accesi competono, uno dei due è sbagliato.

**La Regola Anti-Neon.** I token si chiamano `accent-cyan`, `neon-glow`, `border-neon` per non dover riscrivere ~16 file admin/manager — ma il valore è oro e il look non è mai elettrico. Niente glow al neon, niente cyberpunk, niente fill a gradiente sul testo. Se sembra "gaming", rifallo.

**La Regola del Colore Candidato.** Il colore di un candidato è un accento identitario minimo — barra da 3px a filo sinistro, cifra del numero, riempimento della barra in Classifica, pallino da 44px al 12% di opacità. **Mai** un wash di sfondo della card, mai applicato al testo del nome se non come firma.

**La Regola dell'Inchiostro sull'Oro.** Su qualunque superficie piena d'accento il testo usa `on-accent` (bruno `#1a1206` sul Palco, bianco nello Studio), mai un `#000` o `#fff` hard-coded copiato nel file.

## Typography

**Display Font:** Space Grotesk (fallback Inter, system-ui, sans-serif) — pesi 400–700
**Body Font:** Inter (fallback system-ui, -apple-system, sans-serif) — pesi 400–800
**Numeri:** Space Grotesk con `font-variant-numeric: tabular-nums`

**Character:** Space Grotesk porta una geometria leggermente teatrale a titoli, numeri di gara e punteggi — squadrata ma non fredda. Inter tiene tutto il resto neutro e ad alta leggibilità. La coppia non cerca personalità nel corpo del testo: la mette tutta nei display e nei numeri.

### Hierarchy

- **Display** (Space Grotesk 600, `clamp(2.6rem → 4.5rem)`, lh 0.95, tracking `-0.045em`, MAIUSCOLO): wordmark dell'evento nell'hero pubblico e nel takeover della Classifica presenter. `.gradient-title` / `.neon-text` sono i nomi legacy di questo trattamento (ink solido, nessun gradiente).
- **Headline** (Space Grotesk 600, `~1.5–2rem`, lh 1.05, tracking `-0.03em`, spesso MAIUSCOLO): titolo delle pagine gate ("Area protetta"), titoli di sezione, "Vincitore".
- **Title** (Inter 700, `1.25rem` / `text-xl`, sale a `text-2xl` md): nome del candidato nella card, titoli di card e pannelli.
- **Body** (Inter 400–500, `0.875rem` base): testo esplicativo, descrizioni, messaggi. `text-wrap: pretty` sui paragrafi, `balance` sui titoli.
- **Label / Sopracciglio** (Inter 700, `0.625rem` / 10px, tracking `0.2em`–`0.28em`, MAIUSCOLO, colore `ink-muted` o accento): la firma tipografica del sistema. Apre quasi ogni sezione, card e blocco form ("Gestione eventi", "Area protetta", "Seleziona un punteggio", "Progresso voto").
- **Numeric** (Space Grotesk 600, tabular): numero di gara del candidato (`padStart(2,'0')`), pulsanti punteggio, contatore progresso `X/N`, count-up del punteggio finale (3 decimali), statistiche della dashboard.

### Named Rules

**La Regola del Sopracciglio.** Ogni sezione, card o blocco form si apre con un'etichetta da 10px in maiuscoletto, tracking `≥0.2em`, in `ink-muted` o nell'accento. È il modo in cui il sistema segna l'inizio di un'unità di contenuto senza una linea o un riquadro.

**La Regola dei Numeri Tabellari.** Qualunque cifra che possa cambiare o essere confrontata — punteggi, conteggi, numeri di gara, risultato finale — è in Space Grotesk `tabular-nums`. Le colonne di numeri non devono mai "ballare".

**La Regola del Maiuscoletto Misurato.** Il MAIUSCOLO è per display, headline ed etichette, sempre con tracking negativo sui display e positivo (`≥0.14em`) sulle etichette. Mai testo di lettura in maiuscolo.

## Layout

Colonna centrata, mai a tutta larghezza. Le pagine pubbliche vivono in `max-w-2xl` (~42rem): header sticky da `h-14`, hero, lista di candidati a piena larghezza di colonna. Le pagine di regia usano una shell `mat-sidenav-container`: rail sinistro fisso da 14–18rem (`w-72` sul manager, ridotto a `14.4rem` sull'admin) con nav-list e bottone "Esci" in fondo, contenuto in `max-w-6xl` con padding `px-4 py-6` che sale a `md:px-8`. Su handset il rail diventa `over` e si apre da un bottone hamburger nella toolbar.

**Ritmo:** gutter di colonna `1rem`; padding card `1rem` (pubblico) / `1.5rem` (pannelli regia); stack verticale tra blocchi `space-y-6` (`1.5rem`). Le card di riepilogo si dispongono in `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`.

**Densità:** comoda e touch-first sul Palco — bersagli minimi da 44px, pulsante punteggio `3.25rem` che sale a `3.5rem` da `md`, griglia punteggi `grid-cols-5` che diventa `grid-cols-10` da `md`. Più fitta nello Studio: form a `sm:grid-cols-2`, righe compatte, `subscriptSizing="dynamic"` sui field Material.

**Breakpoint:** default Tailwind, mobile-first. Il salto di impaginazione principale è a `md` (768px); `sm` (640px) per le griglie di card; `lg` (1024px) per la terza colonna.

## Elevation & Depth

**Piatto a riposo, ombra calda come evento.** Ogni superficie è piatta con un bordo hairline; la profondità di base viene dal valore di sfondo (`stage-black` → `stage-raised` → `stage-card` → `stage-card-hover`), non da un'ombra. L'ombra compare **solo come risposta a uno stato**: hover di una card, selezione, lift del vincitore. Sul Palco tutte le ombre sono tinte di bruno quasi-nero (`rgba(8,5,2,…)`), **mai `#000` a bassa opacità**. Nello Studio le stesse ombre sono ricalibrate su `rgba(18,20,24,…)`, più corte e leggere.

Un tocco distintivo: `.glass` porta un *inset* highlight da 1px in alto (`inset 0 1px 0 rgba(255,255,255,0.04)`) — il bordo superiore che cattura la luce di scena — sopra il drop tinto.

### Shadow Vocabulary

- **card** (`0 1px 2px rgba(8,5,2,.45), 0 10px 30px -12px rgba(6,4,1,.7)`): hover di una card cliccabile, superficie `.glass` a riposo (con l'inset highlight).
- **lift** (`0 2px 6px rgba(8,5,2,.5), 0 20px 48px -16px rgba(0,0,0,.72)`): hover marcato, card sollevata, elementi che si staccano dal flusso.
- **gold** (`0 0 0 1px border-lit, 0 14px 44px -10px rgba(255,176,32,.24), 0 10px 28px rgba(0,0,0,.5)`): esclusivo della card selezionata/vincente. È l'unico posto in cui l'accento entra in un'ombra.
- **winnerGlow** (keyframe animato, 1.7s): alone caldo che si posa attorno alla card del vincitore nella Classifica — bloom ambientale morbido, non un anello al neon. Si ferma ben prima del look elettrico.

### Named Rules

**La Regola Piatto-di-Default.** Le superfici sono piatte a riposo. Un'ombra è sempre la risposta a qualcosa (hover, selezione, focus, cerimonia) — mai una decorazione di base. Se togli lo stato e l'ombra resta, è di troppo.

**La Regola dell'Ombra Calda.** Nessuna ombra usa nero puro. Palco: `rgba(8,5,2,…)`. Studio: `rgba(18,20,24,…)`. Il nero a bassa opacità legge grigio-freddo e rompe la scena.

## Shapes

Raggi raggruppati, non a scaletta larga. La scala è stata ri-puntata perché i passi si addensino (6 → 10 → 12 → 14 → 16 → 20px) invece di saltare da 8 a 24: fratelli che mescolano `rounded-lg` e `rounded-2xl` ora leggono come un sistema.

- **6px** (`radius-sm`): chip, tag, pill di stato.
- **10px** (`radius-md`): input, bottoni piccoli (`.btn-sm`), swatch del color picker.
- **12px** (`radius-lg`): bottoni standard.
- **14px** (`radius-xl`): pannelli annidati (`.surface-panel`), pulsante punteggio, superficie della snackbar.
- **16px** (`radius-2xl`): card (`.glass`, `.surface-card`), blocchi form.
- **20px** (`radius-3xl`): hero, superfici takeover, dialoghi Material.

Bordi: quasi sempre un hairline da 1px (`hairline` all'8% sul Palco, `studio-hairline` al 10% nello Studio). Il bordo acceso (`border-lit`) è riservato allo stato selezionato/vincente. Nessun clipping decorativo, nessuna silhouette irregolare: la geometria è rettangolare con angoli ammorbiditi, sempre.

## Components

### Buttons

Rifiniti e trattenuti: presenza minima, molto respiro, un solo pieno d'accento per vista, un micro-press tattile allo `:active` (`scale(0.97)`) come unica esuberanza.

- **Shape:** angoli ammorbiditi, 12px (`radius-lg`); 10px in taglia `sm`.
- **Primary** (`.btn.btn-primary`): pieno **Oro da Ribalta**, testo `on-accent` bruno, bordo trasparente, padding `0.625rem 1rem`, peso 600. Uno per vista.
- **Hover / Focus:** primary schiarisce di `brightness(1.08)` (nella Classifica passa a champagne); focus-visible porta l'anello globale da 2px in accento con offset 2px. Nessuno spostamento di layout.
- **Tinted** (`.btn-tinted`): azione d'accento a basso impegno — fondo accento al 14%, testo accento, bordo accento al 32%. È il default dei form di regia ("Salva").
- **Ghost** (`.btn-ghost`): secondario / annulla — trasparente, testo `ink-secondary`, bordo hairline; su hover prende `card-hover` e l'inchiostro pieno.
- **Danger** (`.btn-danger`): fondo rosso al 14%, testo `#d68d82`, bordo rosso al 28%. Mai un rosso pieno.
- I bottoni Material (`mat-stroked-button`, `mat-flat-button`, `mat-icon-button`) sono usati nelle shell di regia e si ri-skinano dai `--mat-sys-*` ri-puntati; container-shape override a 14px.

### Status pill (`.status-pill`)

L'unico badge di stato del sistema — "Televoto aperto / chiuso", conteggi di codici, "Attivo", "Archiviato". Pill da 6px (`radius-sm`), 0.6875rem maiuscoletto `tracking-[0.1em]`, bordo hairline in tinta. Il colore è **sempre** accoppiato all'icona o al pallino che il call site fornisce, così lo stato non è mai segnalato dalla sola tinta.

- `.status-open` → tinta/bordo/testo `signal-open` (verde). `.status-warn` → `signal-warn` (ocra). `.status-danger` → `signal-danger` (mattone). `.status-neutral` → `card-hover` + `ink-secondary` per gli stati informativi senza valenza.
- Sostituisce le vecchie `<mat-chip disabled>` (che MDC grigiava al 38%) e i box `emerald/amber/red` hand-rolled.

### Notice (`.notice`)

Il box di avviso/errore a piena larghezza. `radius-xl`, icona 18px opzionale a sinistra, `.notice-danger` / `.notice-warn` / `.notice-ok` per la tinta (tutti via `signal-*`). Rimpiazza i box di errore hand-rolled a tre raggi e due famiglie di colore (`accent-coral` vs `red-*`).

### Cards / Containers

- **Corner Style:** 16px (`radius-2xl`) per le card, 14px per i pannelli annidati.
- **Background:** `stage-card` (`#141417`) sul Palco, `#ffffff` nello Studio. Selezionata: `stage-card-selected` + `border-lit` + ombra gold.
- **Shadow Strategy:** vedi Elevation — piatta a riposo (solo inset highlight su `.glass`), ombra `card`/`lift` su hover, `gold` solo se selezionata.
- **Border:** hairline 1px sempre presente; `border-lit` solo sullo stato acceso. La card "votata" scende a `opacity: 0.72` e bordo bianco al 6%.
- **Internal Padding:** `1rem` (`p-3.5`/`p-4`) sulle card pubbliche, `1.5rem` sui pannelli di regia.

### Inputs / Fields

- **Style** (`.field-input`): fondo `stage-raised`, bordo hairline 1px, raggio 10px, padding `0.5rem 0.75rem`, testo `ink-primary`, placeholder `ink-muted`.
- **Focus:** bordo accento + `box-shadow: 0 0 0 1px accent` (un anello sottile, non un glow). Nessun cambio di dimensione.
- **Disabled:** `opacity: 0.5`, cursore `not-allowed`.
- **Native checkbox / radio / color:** ristilizzati globalmente — `accent-color` in accento, swatch del color-picker con bordo hairline e raggio coerente.
- I `mat-form-field` (select evento) usano `appearance="outline"` e devono passare `panelClass="theme-pro"` perché l'overlay CDK è fuori dalla shell.

### Navigation

- **Header pubblico:** barra sticky `h-14`, `backdrop-blur-xl` su `bg-primary/85`, hairline inferiore. Wordmark = barretta accento da `h-4 w-1` + "Televoto" in display 16px maiuscoletto `tracking-[0.14em]` + tagline da 10px.
- **Rail di regia:** `mat-nav-list`, voce attiva con tinta accento /15 e testo accento, raggio 12px; icona Material + label + eventuale meta-conteggio a destra. In fondo, divider + bottone "Esci" ghost a piena larghezza.
- **Mobile:** il rail passa a `over`, aperto da un `mat-icon-button` hamburger nella toolbar.

### Score Selector (componente firma)

Griglia di 10 pulsanti quadrati (`aspect-ratio: 1`, `grid-cols-5` → `grid-cols-10` da `md`), raggio 14px, font display tabular. A riposo ogni pulsante è riempito d'oro a **opacità crescente** (`0.05 + score/10 * 0.22`): la riga si legge come un misuratore che si carica verso il 10. Selezionato: pieno oro, testo `on-accent`, `box-shadow: 0 0 0 2px accent`. Sotto, due etichette-sopracciglio "Minimo" / "Massimo". `:active` → `scale(0.94)`.

### Classifica presenter (componente firma)

Title card a schermo intero, una posizione alla volta. Il numero di posizione atterra con `animate-stage-slam` (sovradimensionato + sfocato → snap), le posizioni precedenti collassano in una scala che entra sfalsata, il vincitore ottiene il takeover oro con `winnerGlow` + count-up sul punteggio finale a 3 decimali. Beat oro-tinto per il terzo, doppio pannello per la "finale a due", gestione "pari merito". Tutto collassa sotto `prefers-reduced-motion`.

### Loader (componente firma)

`.stage-loader`: quattro barre verticali da 4px in accento che pulsano come un equalizzatore (`barPulse`, delay sfalsati di 0.14s). È il loader di tutto il sistema — niente spinner circolari.

### Stepper del ciclo (regia)

Striscia di orientamento in cima a ogni sezione di `/manager`: `Candidati → Codici → Televoto → Classifica`, derivata dagli stessi input di `contextualDefaultEventManagerSection` (`candidateCount` + `votingClosed`). Marker da 24px in `font-display tabular-nums`: `done` = tinta accento /15 + icona `check`; `current` = pieno accento + `on-accent`; `todo` = hairline + `text-muted`. Connettore hairline tra i marker (accento /50 sui segmenti completati). Quieto — `pb-4` + bordo inferiore, dimensioni piccole: è orientamento, non un hero. Scorre internamente (`overflow-x-auto`) su schermi stretti, il body non scrolla mai in orizzontale.

## Do's and Don'ts

### Do:

- **Do** aprire ogni sezione/card con l'etichetta-sopracciglio da 10px (maiuscoletto, tracking `≥0.2em`, `ink-muted` o accento).
- **Do** usare un solo bottone pieno d'accento per vista; per tutto il resto `.btn-tinted` / `.btn-ghost`.
- **Do** tenere le superfici piatte a riposo e introdurre l'ombra solo come risposta a hover / selezione / focus / cerimonia.
- **Do** usare `on-accent` per il testo su qualunque pieno d'accento, e ombre tinte di caldo (`rgba(8,5,2,…)` Palco, `rgba(18,20,24,…)` Studio) — mai `#000`.
- **Do** mettere tutte le cifre confrontabili in Space Grotesk `tabular-nums`.
- **Do** far entrare le nuove superfici di overlay (dialog, select panel) in `.theme-pro` via `panelClass`, altrimenti sul lato regia restano scure.
- **Do** rispettare la scala di raggi raggruppata (6/10/12/14/16/20) e il bordo hairline da 1px come default.
- **Do** trattare il colore del candidato come accento minimo (barra 3px, numero, fill) e progettare ogni stato in modo che regga anche in monocromia.

### Don't:

- **Don't** far somigliare nulla a una dashboard SaaS ("Material blu", card grigie uniformi, grafici e tabelle ovunque), a un'app di sondaggi consumer (pastelli, emoji, tono giocoso) o a un'estetica neon/gaming (glow elettrici, gradienti sul testo) — anche se i token si chiamano `neon`/`glass`/`gradient`.
- **Don't** usare il colore del candidato come sfondo pieno della card o applicarlo al testo del nome.
- **Don't** introdurre un secondo colore d'accento: gli alias `accent-magenta` / `accent-violet` puntano di proposito all'unico accento.
- **Don't** usare il champagne `victory` per elementi interattivi — è riservato al beat del vincitore così non sembra cliccabile.
- **Don't** usare spinner circolari: il loader del sistema è l'equalizzatore `.stage-loader`.
- **Don't** aggiungere ombre di base alle card o `#000` a bassa opacità.
- **Don't** mettere testo di lettura in maiuscolo (solo display, headline, etichette).
- **Don't** rompere `prefers-reduced-motion`: ogni `animate-*` e ogni transizione tattile ha già il suo fallback in fondo a `styles.scss`.
