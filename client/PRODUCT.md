# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- Votanti e giudici da mobile web in sala; admin e manager da desktop in regia; Classifica proiettata su schermo grande. Nessuna app nativa. -->

## Users

- **Organizzatori / registi di eventi dal vivo** — talent e gare artistiche (canto, ballo, concorsi di bellezza, concorsi scolastici) con pubblico in sala. L'obiettivo dichiarato è servire **più organizzatori diversi**, non un singolo ente ricorrente.
- **Root admin** — gestisce tutti gli eventi di un'installazione: crea/archivia/clona eventi, ruota le password, supervisiona. Lavora da laptop dietro le quinte.
- **Manager evento** — gestione operativa di **un solo** evento: candidati, codici voto, ciclo di votazione, apertura Classifica. Da laptop in regia durante l'evento. Non deve poter vedere o raggiungere altri eventi.
- **Giuria "qualificata"** — giuria tecnica; voto pesato, intero 1-10 per ogni candidato. Accede dal proprio dispositivo tramite link/QR opaco monouso.
- **Votanti "popolari"** — il pubblico in sala. Vota dal proprio telefono, spesso al buio, su rete mobile incerta, di fretta tra un'esibizione e l'altra. Modalità numerica (1-10) o a preferenze (elezione).
- **Spettatori della premiazione** — guardano la Classifica finale proiettata su schermo grande / LED wall.

## Product Purpose

Gestire in diretta la votazione di un evento dal vivo: raccogliere i voti di giuria e pubblico durante le esibizioni, chiudere il televoto al momento giusto e rivelare la Classifica finale con una cerimonia in stile broadcast. Il successo è un evento condotto senza intoppi dalla regia, un risultato numericamente credibile e una premiazione d'effetto sullo schermo grande.

## Positioning

Meccaniche di calcolo che un semplice sondaggio non replica:

- Due pool di voto (qualificata / popolare) fusi con **pesi per-evento** (default 70/30); il blend rinormalizza sulla somma dei pesi effettivamente applicati.
- **Le astensioni contano in modo asimmetrico**: la media della giuria qualificata è divisa per il numero di token eleggibili non revocati (chi non vota trascina giù il candidato); i voti del pubblico sono una media sui soli voti espressi (la partecipazione del pubblico è discontinua e non deve penalizzare). Un candidato con zero voti popolari esce dal calcolo popolare e il peso qualificata è rinormalizzato al 100%.
- **Trimmed mean** opzionale sui voti popolari per ridurre gli outlier.
- Due modalità di voto popolare — numerico 1-10 o **scheda a preferenze** (approvazione/elezione, fino a `maxPreferences`) — scelte alla creazione e **immutabili**.
- Codici giudice **opachi, monouso, salvati solo come hash**, distribuiti via link/QR; la rigenerazione ri-genitorizza i voti esistenti così l'avanzamento del giudice sopravvive.
- Dashboard di **avanzamento voti in tempo reale** (SSE) per la regia.
- Classifica in **modalità presenter**: title card a schermo intero, count-up sul punteggio, beat "terzo classificato", "finale a due", takeover del vincitore con gestione "pari merito".

## Operating Context

- Evento dal vivo con pubblico; regia dietro le quinte con laptop (admin + manager insieme).
- Pubblico in sala in penombra, vota dal telefono su rete mobile, in finestre di tempo brevi tra le esibizioni.
- Giudici votano dal proprio dispositivo tramite link/QR con `eventCode` + `judgeToken` (16 caratteri, inseriti/mostrati in 4×4 segmenti).
- Classifica proiettata su schermo grande durante la premiazione.
- Ciclo evento: creazione → candidati → generazione codici → **avvio votazione** (reset distruttivo: rinumera candidati, azzera voti, riapre il televoto) → chiusura televoto → apertura Classifica. "Azzera classifica" è il reset leggero (solo voti + riattiva i token). La Classifica non si apre finché il televoto è aperto.
- Contesto multi-evento: un admin gestisce più eventi in parallelo; eventi archiviabili e clonabili (candidati + pesi, senza voti né codici).
- Accesso all'evento via `?eventCode=`; `/manager` e `/score` richiedono prima il codice evento, poi la password.

## Capabilities and Constraints

**Funzionalità confermata**

- Gestione eventi (crea, rinomina, sottotitolo, pesi giurie, trimmed mean, archivia, disarchivia, clona).
- Gestione candidati (nome, performance/sottotitolo, colore identitario, rinumerazione contigua alla cancellazione); modifiche bloccate a televoto aperto.
- Gestione codici giudice: generazione singola e in blocco, tipo QUALIFICATA/POPOLARE, revoca, QR, rigenerazione singola e "Rigenera tutti i codici", validazione lato votante.
- Ciclo di votazione: avvio, chiusura, azzera classifica; stato `votingClosed` esplicito.
- Voto: intero 1-10 validato lato server; voto unico per `(candidateId, judgeTokenId)`; modalità preferenze con contatore "Preferenze espresse X/N".
- Classifica finale e `partial-rankings` per la dashboard live; presenter mode.
- Rotazione password root e password manager per-evento.

**Vincoli durevoli**

- **Lingua italiana** su tutta la UI e i messaggi di errore del server. Nessuna internazionalizzazione prevista. (Vincolo confermato dall'utente.)
- **Stack frontend fisso: Angular + Angular Material.** Nessun cambio di framework o libreria di componenti. (Vincolo confermato dall'utente.) Backend Express + Prisma + PostgreSQL; monorepo npm workspace con `client` come membro.
- **Solo 4 rotte flat**: `/` (voto), `/admin`, `/manager`, `/score`. Vincolo hard del backend (fallback SPA senza wildcard); aggiungere una rotta richiede modifiche coordinate in `app.routes.ts`, `server/index.ts` e `vercel.json`.
- Nessun sistema di account utente: due livelli di auth a password (root globale in `RootCredential`; una password per evento in `EventManagerCredential`). Token bearer firmati HMAC, TTL 12h, nessuna sessione server-side; password in PBKDF2 hash+salt.
- Persistenza client solo in `sessionStorage` (token root/manager); si svuota alla chiusura del tab.
- Nessun fingerprinting del dispositivo per il pubblico: l'identità del votante è il token, non il device.
- `popularVoteMode` e `maxPreferences` immutabili dopo la creazione dell'evento.
- Colore del candidato = piccolo accento identitario (barra, numero, riempimento), mai wash di sfondo.
- Deploy duale sullo stesso app Express: processo long-running self-hosted **oppure** funzione serverless Vercel; l'adapter `api/[...path].ts` resta sottile.

**Terminologia**

- "Classifica" = pagina/vista dei risultati (`/score`). "Televoto" = la finestra di voto aperta/chiusa, e il nome del prodotto. "Qualificata" = giuria tecnica pesata; "Popolare" = pubblico. "Manager" = responsabile di un singolo evento; "Root/Admin" = super-utente cross-evento. "Codice evento" (`eventCode`), "Codice giudice" (`judgeToken`).

**Esplicitamente indeciso**

- Se il prodotto diventerà un servizio commerciale multi-cliente vero e proprio: oggi non esiste onboarding organizzatori, billing, né isolamento multi-tenant oltre la separazione per evento. "Più organizzatori" è un'intenzione, non una capability implementata.

## Brand Commitments

- **Nome "Televoto"** — in uso ovunque (wordmark testuale "Televoto" + barretta accent, favicon SVG). L'utente **non** lo ha marcato come vincolo fisso: riconsiderabile in fase di new-work, ma è l'identità incumbent.
- **Lingua italiana** — vincolante (vedi sopra).
- **Sistema a due temi incumbent** — "Palco" (scuro, linguaggio broadcast/premiazione, superfici solide con bordo hairline, un solo accent oro `#ffb020`, per il pubblico su `/` e `/score`) e "Studio" (chiaro, workspace professionale, accent ambra `#b45309`, per `/admin` e `/manager`, via classe host `.theme-pro`). Font: Space Grotesk (display/numeri), Inter (testo). L'utente **non** ha bloccato esplicitamente nome e temi: sono incumbent e trattabili come evidenza, non come contratto.
- Dettagli di theming e token in `client/CLAUDE.md` e nel blocco `@theme` di `client/src/styles.scss` (nomi dei token legacy "Neon Dark").

## Evidence on Hand

- **Dati demo/seed** — `prisma/seed.ts`, `scripts/create_db_from_zero.sql` (schema `televoto` + seed dimostrativo per reset locali).
- **Manuali generati** — `scripts/generate-manuals.ts` / `generate-manuals-typ.ts`.
- **Placeholder SVG** — `client/public/placeholders/` con `README.md` che mappa dove andrebbero immagini reali (banner evento, foto candidato, wordmark, sfondi dei gate di accesso, backdrop del presenter, empty state, illustrazioni di conferma voto e del vincitore). **Nessuno di questi asset reali esiste ancora**; sono materiale di prova, il codice non li referenzia.
- **Nessun logo reale**, nessuna testimonianza, nessun cliente nominato, nessun numero di utilizzo o case study: **da non inventare** in nessun lavoro futuro.

## Product Principles

1. **L'evento dal vivo non aspetta.** Ogni azione di regia deve essere rapida, con stato sempre leggibile (televoto aperto/chiuso, avanzamento voti) e reversibile dove il modello lo consente; le azioni distruttive (avvio votazione, azzera classifica) sono dichiarate come tali.
2. **Il pubblico vota in condizioni ostili.** Buio, fretta, rete mobile: il percorso di voto deve essere a prova di errore, ad alto contrasto e comprensibile a colpo d'occhio, indipendente dal colore.
3. **Il risultato deve essere credibile.** Le regole di calcolo (pesi, asimmetria delle astensioni, trimmed mean, esclusione a zero voti) sono esplicite e coerenti tra dashboard parziale e Classifica finale.
4. **La premiazione è spettacolo.** La Classifica in presenter mode è progettata per lo schermo grande e per costruire tensione e sorpresa, non come una semplice tabella.
5. **Separazione netta dei ruoli.** Un manager di evento non deve mai poter vedere o raggiungere un altro evento; il root è l'unico ponte cross-evento.

## Accessibility & Inclusion

- **Voto del pubblico da telefono in sala buia**: alto contrasto, target touch generosi, nessuna informazione veicolata dal solo colore, funzionamento su rete lenta/intermittente.
- **Classifica proiettata**: deve restare leggibile da lontano su schermo grande.
- `prefers-reduced-motion` è già gestito globalmente in `styles.scss` (presenter mode compresa) — da preservare.
- Nessuno standard formale (es. WCAG 2.x AA) è stato dichiarato dall'utente come requisito contrattuale; le esigenze sopra derivano dalla scena d'uso reale.
