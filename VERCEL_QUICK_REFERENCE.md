# 🚀 Checklist Deployment Vercel - Televoto

## ✅ Prima di deployare

- [ ] Repository GitHub creato e pushato
- [ ] File `.env.example` presente nel repo
- [ ] `vercel.json` configurato
- [ ] Prisma schema aggiornato per PostgreSQL
- [ ] `package.json` build scripts corretti
- [ ] Test locale: `npm run build` passa
- [ ] Supabase connection string ottenuta

---

## 🔑 Requisiti

| Cosa | Dove | Come |
|------|------|------|
| **Supabase Account** | https://supabase.com | Signup gratuito |
| **GitHub Account** | https://github.com | Verificato |
| **Vercel Account** | https://vercel.com | Login con GitHub |
| **Database URL** | Supabase Dashboard | Settings → Database → Connection String |

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
| Framework | Vite |
| Build Command | `npm run build` |
| Output Dir | `dist` |
| Node Version | 20.x |

### 4️⃣ Environment Variables ⚠️ IMPORTANTE
Nella sezione **Environment Variables**, aggiungi:

```
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.cowzpxxpvizcxamyizhg.supabase.co:5432/postgres
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
Dovrebbe mostrare l'app Televoto

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
3. Controlla il password di Supabase
4. Trigger rebuild: click "Redeploy"
```

### ❌ "Connessione rifiutata"
```
✅ Soluzione:
1. Su Supabase → Settings → Database → Networking
2. Disabilita "Enforce SSL" temporaneamente, oppure
3. Aggiungi IP di Vercel a whitelist
```

### ❌ Frontend si carica ma API è lento
```
✅ Soluzione: I serverless functions hanno cold start (1-2s iniziali)
Aspetta o upgrade Vercel Pro
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
| Supabase Console | https://app.supabase.com |
| GitHub Repo | https://github.com/YOUR_USER/televoto |
| App Live | https://your-project.vercel.app |
| Environment Vars | https://vercel.com/projects/YOUR_PROJECT/settings/environment-variables |
| Supabase DB Settings | https://app.supabase.com → Settings → Database |

---

## 📞 Supporto

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
