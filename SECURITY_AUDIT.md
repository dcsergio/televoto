# Audit di sicurezza — Televoto (2026-09-12)

Contesto: app Angular + Express/Prisma, deploy su **Vercel** (funzione serverless `api/[...path].ts` + build statica Angular), database **PostgreSQL su Neon**. Obiettivo: valutare se l'app è pronta per un utilizzo in produzione reale (mercato pubblico), non solo per un uso interno/demo.

**Sintesi**: non sono emerse vulnerabilità critiche. Il modello di autenticazione a due livelli, l'hashing delle password (PBKDF2, 210k iterazioni), il confronto a tempo costante dei token, Helmet/CSP, la gestione degli errori (niente stack trace/segreti esposti al client) e l'assenza di SQL injection (Prisma parametrizzato, nessuna query raw) sono implementati correttamente. I problemi reali riguardano soprattutto **l'adattamento all'ambiente serverless (Vercel + Neon)**, non la logica applicativa. Prima di andare in produzione con traffico pubblico vanno risolti almeno i due punti "Alta priorità".

---

## 🔴 Alta priorità (da risolvere prima del lancio)

### 1. Connection pooling — ✅ RISOLTO in parte (2026-09-12), residuano 2 accorgimenti

**Aggiornamento:** `.env` è stato aggiornato con la connection string **pooled** di Neon (host con suffisso `-pooler`, via PgBouncer, `sslmode=require&channel_binding=require`). Il rischio principale — esaurimento delle connessioni dirette durante un evento di voto live — è risolto lato runtime.

Restano due accorgimenti minori, verificati su `server/db/prisma.ts` e `prisma.config.ts`:

- **`max` del pool ancora non limitato**: `server/db/prisma.ts:6` crea `new Pool({ connectionString: env.databaseUrl })` senza `max` esplicito (default `pg`: 10). Passando ora per PgBouncer questo è molto meno rischioso di prima, ma ogni istanza serverless ha comunque bisogno solo di poche connessioni: consigliato `new Pool({ connectionString: env.databaseUrl, max: 3 })` per restare ben dentro i limiti anche con molte istanze concorrenti.
- **`PRISMA_CLI_URL` non impostato**: `.env` non definisce `PRISMA_CLI_URL`, quindi `prisma.config.ts:38` fa fallback su `DATABASE_URL` (ora quello pooled) anche per la CLI di migrazione. Neon raccomanda di usare la connection string **diretta** (non-pooled) per `prisma migrate`/`db:push`, perché PgBouncer in transaction mode può avere problemi con i lock di sessione usati dalle migration. Da aggiungere: `PRISMA_CLI_URL` con l'host Neon *senza* `-pooler`, riservando quello pooled solo al runtime applicativo.

### 2. Rate limiting non distribuito e IP-keying inaffidabile dietro il proxy di Vercel
`server/middleware/rate-limit.middleware.ts` usa lo store in-memory di default di `express-rate-limit`, con chiave `req.ip`. Due problemi che si sommano su Vercel:

- **Store in-memory per istanza**: ogni istanza serverless "calda" ha il proprio contatore. I limiti configurati (es. 10 tentativi di login / 15 min, 60 voti / min) sono di fatto *per istanza*: con lo scaling orizzontale di Vercel, un attaccante ottiene un multiplo del limite previsto semplicemente colpendo istanze diverse.
- **`trust proxy` non configurato**: in `server/index.ts` non viene mai chiamato `app.set("trust proxy", ...)`. Dietro il proxy/edge di Vercel questo può far sì che `req.ip` risolva sempre allo stesso indirizzo (bloccando *tutti* gli utenti dopo l'abuso di uno solo) oppure che il rate limiter non funzioni affatto.

**Impatto concreto**: gli endpoint di login (root/manager) e di voto pubblico sono più esposti a brute-force e spam di quanto sembri dal codice.

**Da fare:**
- Aggiungere `app.set("trust proxy", 1)` (valore raccomandato da Vercel) così `X-Forwarded-For` viene letto correttamente.
- Se la resistenza a brute-force/spam è un requisito reale per il lancio (probabile, essendo un'app di voto pubblico), spostare i limiter di login e voto su uno store condiviso (es. Redis via Upstash, o una tabella Postgres dedicata) invece del default in-memory.

---

## 🟠 Priorità media

### 3. Token bearer nell'URL per lo stream SSE
`GET /api/events/:eventId/judge-tokens/stream` accetta il token via query string (`?authToken=...`, `server/routes/judge-tokens.routes.ts`, necessario perché `EventSource` nativo non supporta header custom). Il token di sessione (valido 12h, con privilegi pieni di root/manager) finisce quindi nei log di accesso di Vercel, nella cronologia del browser ed eventuali log di proxy intermedi.

**Da fare (se si vuole ridurre il rischio, non bloccante):** introdurre un token dedicato allo stream, a vita breve (pochi minuti) e con permessi limitati a quel solo `eventId`/stream, emesso da un endpoint apposito invece di riusare il token di sessione completo.

### 4. Vulnerabilità npm audit su dipendenze transitive di Prisma CLI
`npm audit` segnala ~8 alte/9 moderate, tutte transitive del tooling CLI di Prisma (`mysql2`, `hono`, `valibot`, `qs`, `fast-uri`, `deepmerge-ts` sotto `@prisma/config`/`prisma`), non del runtime effettivamente eseguito in produzione (che usa solo `@prisma/adapter-pg` + `pg`). Rischio reale basso, ma da monitorare.

**Da fare:** ri-eseguire `npm audit --omit=dev` prima/dopo ogni aggiornamento di Prisma; aggiornare a una versione patchata di Prisma quando disponibile.

### 5. Nessun pin della versione Node
`package.json` non ha un campo `"engines"`. Senza un pin, un cambio della versione Node di default su Vercel può alterare silenziosamente il comportamento (es. default di crypto/TLS) tra un deploy e l'altro, senza alcun segnale nel repo.

**Da fare:** aggiungere `"engines": { "node": ">=22" }` (o la versione effettivamente testata) e allineare la versione Node nelle impostazioni del progetto Vercel.

---

## 🟡 Priorità bassa

### 6. Nessun rate limit sugli endpoint di cambio password
`/api/auth/root/password` e `/api/auth/event/:eventId/password` richiedono un token di sessione valido ma non hanno un rate limiter sui tentativi di `currentPassword`, a differenza degli endpoint di login. Severità bassa (serve comunque un token valido rubato), ma per difesa in profondità applicare lo stesso `loginRateLimiter` (o uno dedicato) anche qui.

### 7. `normalizeEventName` senza lunghezza massima
`server/lib/normalize.ts` non impone un limite massimo alla stringa (bounded solo dal limite di 100kb del body JSON di Express e dal tipo `text` di Postgres). Endpoint comunque autenticato (root/manager), quindi rischio limitato a chiamanti già fidati. Da irrobustire per igiene, non urgente (es. max 200 caratteri).

### 8. Piccolo bias statistico nella generazione dei codici giudice
`generateOpaqueToken` (`server/lib/opaque-token.ts`) riduce byte casuali modulo 36 per un alfabeto di 36 caratteri; poiché 256 non è divisibile per 36, alcuni caratteri hanno una probabilità leggermente più alta (~0.1 bit di entropia persi per carattere). Non sfrutabile in pratica sui ~82 bit di entropia totali di un token a 16 caratteri — riportato solo per completezza, nessuna azione necessaria.

---

## ✅ Cose già fatte bene (verificate, nessuna azione richiesta)

- **Helmet + CSP** configurati in `server/index.ts` con policy reale (`default-src 'self'`) — non scontato in un progetto a questo stadio.
- **CORS** (`cors({ origin: false })`) coerente con il deploy same-origin su Vercel (SPA + API sullo stesso dominio): blocca ogni richiesta cross-origin da browser, nessuna allowlist necessaria a meno di introdurre un frontend separato in futuro.
- **Gestione errori** (`server/middleware/error-handler.ts`) sopprime correttamente stack trace/messaggi interni in produzione, restituendo un messaggio generico in italiano — nessuna fuga di segreti verso il client.
- **Nessuna query SQL raw** in `server/` — tutto l'accesso al DB passa dal query builder parametrizzato di Prisma: SQL injection classica non è un vettore realistico.
- **Casting del voto** (`server/services/vote.service.ts`) rivalida sempre lato server il token del giudice (lookup hashato + controllo `eventId` + stato revocato/finalizzato) ad ogni voto, senza fidarsi di identità fornite dal client.
- **CSRF non applicabile**: autenticazione solo via bearer token nell'header `Authorization`, nessuna sessione basata su cookie in tutto il codebase — niente superficie di attacco CSRF.
- **Nessun log di dati sensibili**: l'unico `console.log` in `server/` è il banner di avvio; nessuna password/token loggato.
- **Controlli IDOR corretti**: `candidates.routes.ts` e `judge-tokens.routes.ts` risolvono `eventId` dalla riga del record *prima* di applicare `requireEventManagerAuth`, impedendo mutazioni cross-evento.
- **Endpoint pubblico `/api/events/by-code/:eventCode`**: non espone credenziali (vivono in tabella separata `EventManagerCredential`, mai inclusa nella query).
- **Modifiche non ancora committate** (pagina impostazioni event-manager: cambio nome/password evento): nessuna regressione — riusano correttamente `requireEventManagerAuth`, lo schema è correttamente limitato al solo campo `name` (impedendo ai manager di modificare pesi/trimmed-mean), e il cambio password rivalida `currentPassword` prima di ruotarla.

---

## Checklist rapida pre-lancio

- [x] Passare a connection string **pooled** di Neon per `DATABASE_URL` runtime (fatto 2026-09-12)
- [ ] Limitare `max` del pool `pg` in `server/db/prisma.ts` (es. `max: 3`)
- [ ] Impostare `PRISMA_CLI_URL` con la connection string **diretta** (non-pooled) di Neon, per le migration
- [ ] Aggiungere `app.set("trust proxy", 1)` in `server/index.ts`
- [ ] Valutare uno store condiviso (Redis/Upstash) per i rate limiter di login e voto se serve resistenza reale a spam/brute-force al lancio
- [ ] Aggiungere `"engines"` a `package.json` e allineare la versione Node su Vercel
- [ ] Rieseguire `npm audit --omit=dev` dopo il prossimo aggiornamento di Prisma
- [ ] (Opzionale) Rate limiter anche sugli endpoint di cambio password
- [ ] (Opzionale) Token SSE dedicato a vita breve invece del bearer token di sessione in query string

Nessuno di questi punti richiede una riscrittura architetturale: sono tutti fix mirati e a basso rischio. Con i due punti ad alta priorità risolti, l'app è ragionevolmente pronta per un lancio pubblico dal punto di vista della sicurezza.
