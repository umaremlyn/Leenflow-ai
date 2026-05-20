# Leen-Co AI Business System — v1.0

A multi-tenant SaaS platform that lets businesses deploy AI assistants trained on their own data.

## Stack
| Layer       | Technology |
|-------------|------------|
| Frontend    | Next.js 15 (App Router, TypeScript, Tailwind CSS) |
| Database    | Supabase (Postgres + pgvector + RLS + Realtime) |
| Auth        | Supabase Auth (JWT + SSR cookies) |
| AI — Chat   | OpenAI GPT-4o-mini |
| AI — Embed  | OpenAI text-embedding-3-small (1536-dim) |
| RAG         | pgvector cosine similarity search |
| Payments    | Paystack (primary) |
| Messaging   | WhatsApp Business Cloud API |
| Deployment  | Vercel |
| Testing     | Vitest (unit/integration) + Playwright (E2E) |
| CI/CD       | GitHub Actions |

---

## Quick start

### 1. Clone and install
```bash
git clone https://github.com/yourname/leenco-ai.git
cd leenco-ai
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in your values. The minimum required for local dev:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### 3. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL editor, run in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_vector_search.sql`
3. (Optional dev) Run `supabase/seed.sql` for sample data

### 4. Run the app
```bash
npm run dev
# Open http://localhost:3000
```

---

## Project structure
```
leenco-ai/
├── .github/
│   ├── workflows/ci.yml          ← GitHub Actions (type-check, test, build, E2E)
│   └── dependabot.yml            ← Automatic security updates
├── scripts/
│   └── pre-deploy-check.sh       ← Run before every production deploy
├── src/
│   ├── app/
│   │   ├── (auth)/               ← Login, Register (public)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/          ← All protected pages
│   │   │   ├── dashboard/        ← Stats, leads, chart, quick actions
│   │   │   ├── ai-assistant/     ← Train, test sandbox, persona, behaviour
│   │   │   ├── conversations/    ← History + detail transcript
│   │   │   ├── leads/            ← Table with filters + export
│   │   │   ├── products/         ← CRUD with slide-over
│   │   │   ├── faqs/             ← CRUD with drag reorder
│   │   │   ├── policies/         ← Tabbed rich text editor
│   │   │   ├── payments/         ← Payment methods manager
│   │   │   ├── analytics/        ← Recharts dashboards
│   │   │   ├── integrations/     ← Widget, WhatsApp, API docs
│   │   │   └── settings/         ← Business, account, billing, security
│   │   ├── api/
│   │   │   ├── assistant/chat/   ← POST: chat (rate-limited, CORS-enabled)
│   │   │   ├── train/            ← POST: retrain knowledge base
│   │   │   ├── products/         ← GET, POST, PATCH, DELETE
│   │   │   ├── faqs/             ← GET, POST
│   │   │   ├── policies/         ← GET, PUT (upsert)
│   │   │   ├── payments/         ← GET, POST
│   │   │   ├── leads/            ← GET, PATCH + /export CSV
│   │   │   ├── conversations/    ← GET
│   │   │   └── webhook/
│   │   │       ├── whatsapp/     ← Meta verification + message handling
│   │   │       └── paystack/     ← Subscription lifecycle events
│   │   ├── error.tsx             ← Global error UI
│   │   ├── not-found.tsx         ← 404 page
│   │   └── loading.tsx           ← Dashboard skeleton
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Badge.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── dashboard/
│   │       ├── Sidebar.tsx
│   │       └── Topbar.tsx
│   ├── hooks/
│   │   ├── useTenant.ts          ← Load current business + user
│   │   ├── useAssistant.ts       ← Load + update assistant config
│   │   └── useRealtimeLeads.ts   ← Supabase Realtime lead notifications
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         ← Browser client
│   │   │   ├── server.ts         ← Server component client
│   │   │   └── admin.ts          ← Service role client (bypasses RLS)
│   │   ├── ai/
│   │   │   ├── rag.ts            ← Embed → retrieve → prompt → GPT-4o-mini
│   │   │   └── train.ts          ← Chunk → embed → store all sources
│   │   └── utils/
│   │       ├── cn.ts             ← Tailwind class merger
│   │       ├── rateLimit.ts      ← Token bucket rate limiter
│   │       ├── apiResponse.ts    ← Standardised response helpers
│   │       └── getIp.ts          ← Extract client IP (Vercel-aware)
│   ├── tests/
│   │   ├── setup.ts              ← Vitest mocks (Supabase + OpenAI)
│   │   ├── unit/
│   │   │   ├── rag.test.ts       ← embedText, retrieveContext, chat
│   │   │   ├── train.test.ts     ← trainTenant
│   │   │   ├── validation.test.ts← Zod schema edge cases
│   │   │   └── security.test.ts  ← Rate limiting, signature verification
│   │   ├── integration/
│   │   │   └── chat-api.test.ts  ← Chat route validation tests
│   │   └── e2e/
│   │       ├── auth.spec.ts      ← Login/register flows
│   │       ├── dashboard.spec.ts ← Protected page navigation
│   │       └── widget.spec.ts    ← Public API + widget accessibility
│   ├── types/index.ts            ← All TypeScript types
│   └── middleware.ts             ← Auth guard + security headers + path blocking
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql ← Tables, RLS, triggers
│   │   └── 002_vector_search.sql  ← match_knowledge_chunks() function
│   └── seed.sql                   ← Dev/test sample data
├── public/
│   └── widget/leenco.js          ← Zero-dependency embeddable chat widget
├── vercel.json                   ← Deployment config + function timeouts
├── vitest.config.ts              ← Unit/integration test config
└── playwright.config.ts          ← E2E test config
```

---

## Testing

```bash
# Unit + integration tests
npm test

# Watch mode
npm run test:watch

# E2E tests (requires running dev server)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

---

## Security features
- **Row Level Security** — every Supabase table has RLS; tenants are fully isolated at the DB level
- **Token bucket rate limiting** — chat (30/min), auth (10/min), train (5/min)
- **Zod validation** — all API inputs validated with explicit schemas before touching the DB
- **Webhook signature verification** — Paystack HMAC-SHA512, WhatsApp verify token
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options on all responses
- **Path blocking** — middleware blocks `.env`, path traversal, and scanner noise
- **No secrets in code** — all secrets in environment variables, `.env.local` in `.gitignore`

---

## Deploying to production

### Step 1 — Run the pre-deploy checklist
```bash
bash scripts/pre-deploy-check.sh
```

### Step 2 — Push to GitHub
```bash
git add .
git commit -m "chore: ready for production"
git push origin main
```

### Step 3 — Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Add all environment variables from `.env.example`
3. Click Deploy

### Step 4 — Configure webhooks
| Service   | Webhook URL                              |
|-----------|------------------------------------------|
| WhatsApp  | `https://your-domain.com/api/webhook/whatsapp` |
| Paystack  | `https://your-domain.com/api/webhook/paystack` |

### Step 5 — First business setup
1. Register at `https://your-domain.com/register`
2. Add products, FAQs, and policies
3. Click "Re-train AI" on the AI assistant page
4. Go live and embed the widget on your website

---

## Embeddable widget

Add to any website before the closing `</body>` tag:

```html
<script
  src="https://your-domain.com/widget/leenco.js"
  data-tenant-id="YOUR_TENANT_ID"
  data-api-url="https://your-domain.com"
  async
></script>
```

---

## API reference

### `POST /api/assistant/chat`
```json
{
  "tenantId":       "uuid",
  "message":        "What products do you sell?",
  "channel":        "website | whatsapp | instagram | api",
  "conversationId": "uuid (optional)",
  "visitorName":    "string (optional)",
  "visitorEmail":   "string (optional)",
  "visitorPhone":   "string (optional)"
}
```
Response:
```json
{
  "data": {
    "conversationId": "uuid",
    "message": "We sell premium ankara fabrics…",
    "confScore": 0.87
  },
  "error": null
}
```
