# Guida Deployment Televoto su Vercel

## 🎯 Panoramica
Il progetto Televoto è una app full-stack con Angular frontend (in `client/`) e Express backend. Vercel supporta entrambi in un singolo deployment usando Serverless Functions.

**Cambiamenti necessari:**
1. Database PostgreSQL su Neon (hosting cloud)
2. Configurare Prisma per PostgreSQL
3. Vercel auto-configura il build
4. Deploy su Vercel

---

## 📋 STEP 1: Preparazione locale (5 min)

### 1.1 Verifica di avere un progetto Neon
Vai a **https://console.neon.tech** e crea un progetto se non lo hai già.

### 1.2 Ottieni la connection string
1. Nel dashboard Neon, seleziona il tuo project
2. Vai a **Connection Details** (nella dashboard principale del progetto)
3. Copia la **Connection String** (formato `postgresql://...`), assicurandoti che includa `?sslmode=require`
4. Salva in un file sicuro

---

## 📝 STEP 2: Configura ambiente locale (5 min)

### 2.1 Crea `.env` con la URL Neon
```bash
DATABASE_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require"
```

### 2.2 Installa dipendenze
```bash
npm install
```

### 2.3 Sincronizza schema locale
```bash
npx prisma db push
```

Se è la prima volta:
```bash
npx prisma migrate dev --name init
```

---

## 🔧 STEP 3: Verifica build locale (10 min)

```bash
npm run build
```

Dovrebbe completare senza errori.

---

## 🚀 STEP 4: Effettua il push su GitHub (5 min)

```bash
git add .
git commit -m "Migrate to PostgreSQL Neon"
git push origin main
```

---

## 📱 STEP 5: Crea app Vercel (10 min)

### 5.1 Vai su https://vercel.com e fai login
- Usa GitHub account

### 5.2 Crea nuovo progetto
1. Clicca **"Add New..."** > **"Project"**
2. Importa il repository `televoto` da GitHub
3. Clicca **"Import"**

### 5.3 Configura variabili d'ambiente
Nella schermata **"Configure Project"**, aggiungi:

| Nome | Valore |
|------|--------|
| `DATABASE_URL` | `postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require` |

### 5.4 Seleziona framework e directory
- **Framework Preset**: Other (rilevamento generico — `vercel.json` imposta già `buildCommand`/`outputDirectory` espliciti per la build Angular)
- **Root Directory**: `/` (root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 5.5 Deploy!
Clicca **"Deploy"** e aspetta 2-3 minuti.

---

## ✅ STEP 6: Verifica deployment (5 min)

### 6.1 Controlla i log
Nella dashboard Vercel:
- Clicca il deployment
- Apri **"Logs"** per debug

### 6.2 Testa frontend
- Apri `https://YOUR_PROJECT.vercel.app`
- Accedi al frontend

### 6.3 Testa API
```bash
curl https://YOUR_PROJECT.vercel.app/api/events/active
```

Dovrebbe tornare JSON con gli eventi.

---

## 🔐 STEP 7: Configura dominio custom (opzionale)

1. In Vercel dashboard, vai a **Settings** > **Domains**
2. Aggiungi il tuo dominio
3. Configura DNS records (dipende dal registrar)

---

## ⚡ Troubleshooting

### Errore: "Cannot access database"
✅ **Soluzione:** Verifica che `DATABASE_URL` sia impostato in Environment Variables su Vercel. Deve contenere la password corretta e `?sslmode=require`.

### Errore: "connection refused"
✅ **Soluzione:** Verifica su Neon che il progetto/compute non sia sospeso (auto-suspend su piano free, si riattiva alla prima query ma può richiedere qualche secondo). Assicurati inoltre di usare l'endpoint corretto (pooled `-pooler` vs diretto) per il contesto serverless di Vercel.

### API ritorna 404
✅ **Soluzione:** Controlla che il `server/index.ts` stia in ascolto sulla porta giusta e che gli endpoint siano corretti.

### Build fallisce con prisma
✅ **Soluzione:** Aggiungi a `vercel.json`:
```json
{
  "buildCommand": "npm install && npm run build",
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 📚 File di riferimento

- `.env.example` - Variabili d'ambiente necessarie
- `vercel.json` - Configurazione build Vercel
- `prisma/schema.prisma` - Schema PostgreSQL
- `package.json` - Build scripts

---

## 🎓 Prossimi passi

1. **Monitor**: Accedi a Vercel Analytics
2. **Auto-deploy**: GitHub → Vercel si sincronizza automaticamente
3. **Database**: Usa la dashboard Neon per gestire il DB
4. **Secrets**: Tieni i password al sicuro in Vercel Environment Variables

---

## 💡 Note importanti

- ❌ SQLite locale NON funziona su Vercel (filesystem temporaneo)
- ✅ PostgreSQL su Neon è perfetto per questo progetto
- ✅ Frontend + Backend deployarsi insieme su Vercel
- ✅ Ogni push a `main` triggerizza auto-deploy
- ✅ Neon è scalabile e affidabile (serverless, autoscaling storage/compute)
