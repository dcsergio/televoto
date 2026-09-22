# 🚀 Checklist Deployment Vercel - Voto Subito

## ✅ Prima di deployare

- [ ] Repository GitHub creato e pushato
- [ ] File `.env.example` presente nel repo
- [ ] `vercel.json` configurato
- [ ] Prisma schema aggiornato per PostgreSQL
- [ ] `package.json` build scripts corretti
- [ ] Test locale: `npm run build` passa
- [ ] Neon connection string ottenuta

---

## 🔑 Requisiti

| Cosa | Dove | Come |
|------|------|------|
| **Neon Account** | https://neon.tech | Signup gratuito |
| **GitHub Account** | https://github.com | Verificato |
| **Vercel Account** | https://vercel.com | Login con GitHub |
| **Database URL** | Neon Dashboard | Project → Connection String |

---

## 📍 STEP-BY-STEP VERCEL

### 1️⃣ Vercel.com - Login
- https://vercel.com
- Click "Sign in" → "GitHub"
- Authorize Vercel

### 2️⃣ Crea Progetto
```
Dashboard → Add New → Project → Select GitHub Repo (televoto)
```

### 3️⃣ Configurazione Build
| Campo | Valore |
|-------|--------|
| Framework | Other (build/output espliciti in `vercel.json`) |
| Build Command | `npm run build` |
| Output Dir | `dist` |
| Node Version | 20.x |

### 4️⃣ Environment Variables ⚠️ IMPORTANTE
Nella sezione **Environment Variables**, aggiungi:

```
DATABASE_URL = postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require
```

✅ Assicurati che sia impostato come **Production**

### 5️⃣ Deploy
Click **"Deploy"** e aspetta...

---

## 🔗 Verifica

### Test Frontend
```
https://your-project.vercel.app
```
Dovrebbe mostrare l'app Voto Subito

### Test API (da terminale)
```bash
curl https://your-project.vercel.app/api/events/active
```

Risposta attesa:
```json
{"id": "...", "name": "...", "candidates": [...]}
```

---

## 🚨 Errori comuni e soluzioni

### ❌ Build fallisce: "prisma not found"
```
✅ Soluzione: In vercel.json aggiungi:
{
  "buildCommand": "npm install && npm run build"
}
```

### ❌ API returns: "Cannot access database"
```
✅ Soluzione: 
1. Vai su Vercel → Settings → Environment Variables
2. Verifica DATABASE_URL sia corretto
3. Controlla la password nella connection string Neon
4. Trigger rebuild: click "Redeploy"
```

### ❌ "Connessione rifiutata"
```
✅ Soluzione:
1. Su Neon → Project → Settings, verifica che il progetto non sia sospeso (auto-suspend su piano free)
2. Verifica che la connection string includa `sslmode=require`
3. Se usi l'endpoint pooled (`-pooler`), assicurati di puntarci nel DATABASE_URL a runtime
```

### ❌ Frontend si carica ma API è lento
```
✅ Soluzione: I serverless functions hanno cold start (1-2s iniziali)
Aspetta o upgrade Vercel Pro. Nota: anche Neon ha un cold start proprio
quando il compute è sospeso per inattività (piano free) - la prima
query dopo un periodo di inattività può richiedere qualche secondo.
```

---

## 🔄 Auto-deploy

Una volta configurato, **ogni push a `main` fa deploy automatico**:

```bash
git add .
git commit -m "Update"
git push origin main

# Vercel rileva il push e deploya automaticamente
# Visualizza i log in: https://vercel.com → Project → Deployments
```

---

## 🎯 URL importanti per riferimento

| Servizio | URL |
|----------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Neon Console | https://console.neon.tech |
| GitHub Repo | https://github.com/YOUR_USER/televoto |
| App Live | https://your-project.vercel.app |
| Environment Vars | https://vercel.com/projects/YOUR_PROJECT/settings/environment-variables |
| Neon DB Settings | https://console.neon.tech → Project → Settings → Connection Details |

---

## 📞 Supporto

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Prisma Docs**: https://www.prisma.io/docs
