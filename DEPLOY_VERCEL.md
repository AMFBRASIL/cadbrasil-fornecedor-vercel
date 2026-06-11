# Deploy na Vercel — CADBRASIL

Dois projetos Vercel no mesmo repositório (monorepo):

| Projeto | Root Directory | Framework | Porta local |
|---------|----------------|-----------|-------------|
| **Frontend** | `.` (raiz) | TanStack Start | 5173 |
| **Backend** | `backend` | Next.js 15 | 3001 |

---

## 1. Projeto Backend (`backend/`)

### Configuração no painel Vercel

- **Root Directory:** `backend`
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Install Command:** `npm install`

O arquivo `backend/vercel.json` já define crons e limites de função.

### Variáveis de ambiente obrigatórias

Copie de `backend/.env.example` e preencha no painel Vercel:

```
NODE_ENV=production
JWT_SECRET=...                    # mín. 32 caracteres
CRON_SECRET=...                   # mín. 16 caracteres (Vercel Cron usa Bearer)

DB_LEGACY_HOST=...
DB_LEGACY_USER=...
DB_LEGACY_PASSWORD=...
DB_LEGACY_NAME=cadbrasilsys

DB_WRITE_HOST=...
DB_WRITE_USER=...
DB_WRITE_PASSWORD=...
DB_WRITE_NAME=cadbrasilv2

FRONTEND_URL=https://seu-frontend.vercel.app
ALLOWED_ORIGINS=                  # domínios extras, separados por vírgula

STORAGE_PROVIDER=s3               # único provedor (Amazon S3)
STORAGE_S3_BUCKET=...
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
STORAGE_CDN_URL=                  # CloudFront ou URL pública do bucket

OPENAI_API_KEY=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASSWORD=...
```

### Banco de dados

O MySQL precisa aceitar conexões externas (não pode ser `127.0.0.1`). Opções:

- PlanetScale, Railway, AWS RDS, DigitalOcean Managed MySQL, etc.
- Libere o IP ou use connection pooler compatível com serverless.

### Cron jobs

Configurado em `backend/vercel.json`:

- `GET /api/cron/health-check` a cada 6 horas
- Vercel envia `Authorization: Bearer {CRON_SECRET}` automaticamente

---

## 2. Projeto Frontend (raiz)

### Configuração no painel Vercel

- **Root Directory:** `.` (vazio ou raiz do repo)
- **Framework Preset:** TanStack Start (detectado via `vercel.json`)
- **Build Command:** `bun run build`
- **Install Command:** `bun install`

### Variável obrigatória

```
VITE_API_URL=https://seu-backend.vercel.app
```

Sem `VITE_API_URL`, o frontend tenta chamar `/api` no próprio domínio e falha em produção.

> Em dev local, deixe `VITE_API_URL` vazio — o proxy do Vite encaminha `/api` → `localhost:3001`.

---

## 3. Desenvolvimento local

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env   # configure
npm install
npm run dev            # :3001

# Terminal 2 — Frontend
cp .env.example .env   # VITE_API_URL vazio
bun install
bun run dev            # :5173
```

---

## 4. O que funciona na Vercel vs. o que não funciona

### Funciona (serverless)

- Login, auth JWT, todas as APIs REST
- Chat IA SICAF (`/api/sicaf-assistant/chat`) via OpenAI
- Upload de documentos via **Amazon S3**
- Licitações, clientes, pagamentos, admin, tickets, etc.
- Extensão Chrome + iframe `/sicaf-assistant-chat`

### Não funciona na Vercel (limitação serverless)

- **Assistente Puppeteer** (`POST /api/sicaf/launch`) — requer Chrome local

O status do assistente retorna `serverless: true` com mensagem explicativa.

---

## 5. CORS

O backend aceita:

- `FRONTEND_URL` configurado
- `ALLOWED_ORIGINS` (lista extra)
- Qualquer `*.vercel.app` (previews de deploy)
- Em dev: todas as origens

---

## 6. Checklist pós-deploy

1. Backend responde em `https://seu-backend.vercel.app/api/v1/health`
2. Frontend carrega e login funciona
3. Upload de documento grava no S3
4. `VITE_API_URL` aponta para o backend correto
5. `FRONTEND_URL` no backend aponta para o frontend correto
6. MySQL acessível a partir da Vercel
7. Cron `health-check` executando (logs no dashboard Vercel)

---

## 7. Domínio customizado

Se usar domínio próprio:

```
Frontend: https://portal.cadbrasil.com.br
Backend:  https://api.cadbrasil.com.br
```

Configure:

- Frontend: `VITE_API_URL=https://api.cadbrasil.com.br`
- Backend: `FRONTEND_URL=https://portal.cadbrasil.com.br`
- Backend: `ALLOWED_ORIGINS=` (se precisar de mais origens)
