# Televoto

Applicazione web per gestire eventi di voto con:
- area voto pubblico/giudici,
- pannello admin,
- Hall of Fame (classifica finale).

Frontend: Angular + Angular Material (in `client/`).  
Backend: Express + Prisma.  
Database: PostgreSQL.

---

## 1) Prerequisiti

- Node.js 20+ (consigliato LTS)
- npm 10+
- Database PostgreSQL raggiungibile dalla macchina locale

---

## 2) Installazione locale

1. Clona il repository.
2. Installa le dipendenze:

```bash
npm install
```

3. Crea il file `.env` partendo da [.env.example](C:/Users/sergi/workspace_js/televoto/.env.example).

Variabili principali:
- `SUPABASE_DIRECT_URL`: URL diretta DB (porta 5432), usata per migration Prisma.
- `SUPABASE_DATABASE_URL`: URL pooled (porta 6543), usata a runtime dal server.
- `PRISMA_CLI_URL` (opzionale): override per i comandi Prisma CLI.
- `ADMIN_AUTH_SECRET`: segreto usato dal backend per firmare i token di sessione admin/manager.
- `ROOT_ADMIN_PASSWORD`: password root iniziale usata solo se la tabella credenziali root è vuota.

> Il server legge `DATABASE_URL` oppure `SUPABASE_DATABASE_URL`.  
> Prisma CLI usa la priorità configurata in [prisma.config.ts](C:/Users/sergi/workspace_js/televoto/prisma.config.ts).

4. Esegui le migration:

```bash
npm run db:migrate
```

5. (Opzionale ma consigliato) Carica dati demo:

```bash
npm run db:seed
```

Per creare un database completamente da zero (drop + create), usa lo script:
- [create_db_from_zero.sql](C:/Users/sergi/workspace_js/televoto/scripts/create_db_from_zero.sql)

---

## 3) Avvio in locale

### Avvio completo (frontend + backend)
```bash
npm run dev
```
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3001`

### Avvio separato
```bash
npm run dev:client
npm run dev:server
```

---

## 4) Build e quality checks

```bash
npm run lint
npm run build
```

Note:
- `npm run build` esegue prima il typecheck del backend (`tsc -b`) e poi la build Angular (`ng build` in `client/`), il cui output finisce in `dist/` alla root del repo.
- `prebuild` genera automaticamente il client Prisma.
- `npm run lint` copre solo il backend (`oxlint`); il frontend Angular non ha ancora un linter configurato.

---

## 5) Come usare il prodotto

## 5.1 Navigazione base

- `/` → pagina votazione
- `/admin` → pannello amministrazione
- `/hof` → Hall of Fame (accesso protetto da password root)

Per votazione e Hall of Fame serve un `eventCode` valido (query string o input iniziale).
Per `/admin` e `/hof` è inoltre richiesta la password root.

## 5.2 Flusso admin (nuova SPA strutturata)

La pagina admin è organizzata in una single-page app con menu:

1. **Gestione eventi**
   - selezione evento corrente,
   - creazione nuovo evento (nome, sottotitolo, codice opzionale),
   - cambio password root (box “Sicurezza root”),
   - rinomina evento selezionato,
   - impostazione/rotazione password manager per evento.

2. **Gestione candidati** (sull’evento selezionato)
   - aggiunta candidato (nome, performance, colore),
   - modifica candidato,
   - eliminazione candidato (con rinumerazione progressiva).
   - Accesso protetto da password manager evento.
   - Le modifiche sono bloccate quando il televoto è aperto.

3. **Gestione votazione** (sull’evento selezionato)
   - avvio gara (`Avvia gara`): azzera voti, rinumera candidati, apre televoto,
   - chiusura televoto,
   - azzeramento classifica (danger zone),
   - gestione codici giudice (generazione, validazione, revoca, QR),
   - dashboard progresso voti giudici.
   - Accesso protetto da password manager evento.

La sezione admin corrente è persistita nella query string (`adminSection=events|candidates|voting-codes|voting-backstage`), quindi i link condivisi possono aprire direttamente la vista desiderata.

## 5.3 Flusso giudici

1. Admin genera codici giudice.
2. Il giudice apre il link/QR ricevuto (contiene `eventCode` + `judgeToken`).
3. Inserisce/modifica voti (1-10 interi per candidato).
4. Conferma finale e blocco codice.

## 5.4 Hall of Fame

- Mostra classifica aggregata per evento.
- Quando il televoto è chiuso, l’area è pensata per consultazione risultati.

---

## 6) Comandi utili

- Dev completo: `npm run dev`
- Solo frontend: `npm run dev:client`
- Solo backend: `npm run dev:server`
- Build: `npm run build`
- Lint: `npm run lint`
- Seed DB: `npm run db:seed`
- Migrazioni DB: `npm run db:migrate`
- Prisma Studio: `npm run db:studio`

---

## 7) Struttura progetto (riferimenti)

- Frontend app Angular: [client/src/app/](C:/Users/sergi/workspace_js/televoto/client/src/app)
- API client frontend: [client/src/app/api/](C:/Users/sergi/workspace_js/televoto/client/src/app/api)
- Pagina admin: [client/src/app/pages/admin-shell/](C:/Users/sergi/workspace_js/televoto/client/src/app/pages/admin-shell)
- Backend Express: [server/index.ts](C:/Users/sergi/workspace_js/televoto/server/index.ts)
- Schema Prisma: [prisma/schema.prisma](C:/Users/sergi/workspace_js/televoto/prisma/schema.prisma)
- Config Prisma CLI: [prisma.config.ts](C:/Users/sergi/workspace_js/televoto/prisma.config.ts)

---

## 8) Note importanti

- Il voto è validato lato server come intero da 1 a 10.
- I file generati Prisma in [src/generated/prisma/](C:/Users/sergi/workspace_js/televoto/src/generated/prisma) non vanno modificati manualmente.
- L’accesso admin usa autenticazione root server-side con token firmato.
- La gestione candidati/codici giudice richiede autenticazione manager evento legata all’`eventId`.
- Le password root e manager evento sono salvate in DB in forma hash+salgatura (PBKDF2).
