# Leen-Co AI Business System

> Multi-tenant SaaS platform — deploy AI assistants trained on your own business data.

[![CI](https://github.com/your-org/leenco-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/leenco-ai/actions)

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | Supabase (Postgres + pgvector + RLS + Realtime) |
| AI — Chat | OpenAI GPT-4o-mini |
| AI — Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Payments | Paystack + webhook handling |
| Messaging | WhatsApp Business Cloud API |
| Email | Resend |
| Deployment | Vercel |
| Testing | Vitest (unit/integration) + Playwright (E2E) |

---

## Quick start

```bash
# 1. Clone & install
git clone https://github.com/your-org/leenco-ai.git
cd leenco-ai
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all values in .env.local

# 3. Set up Supabase — run migrations in order
# Paste each file into the Supabase SQL editor:
# → supabase/migrations/001_initial_schema.sql
# → supabase/migrations/002_vector_search.sql
# → supabase/migrations/003_performance_indexes.sql

# 4. (Optional) Load demo data for development
# → supabase/migrations/004_seed_dev.sql

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Project structure

```
src/
├── app/
│   ├── (auth)/              → /login  /register
│   ├── (dashboard)/         → all protected pages
│   │   ├── dashboard/       → stats, leads preview, quick actions
│   │   ├── ai-assistant/    → training, behaviour, sandbox, persona
│   │   ├── conversations/   → history + [id] transcript view
│   │   ├── leads/           → table with filter + CSV export
│   │   ├── products/        → CRUD with slide-over form
│   │   ├── faqs/            → CRUD with drag-to-reorder
│   │   ├── policies/        → tabbed policy editor
│   │   ├── payments/        → payment method cards
│   │   ├── analytics/       → charts (Recharts)
│   │   ├── integrations/    → widget code, WhatsApp, API
│   │   └── settings/        → profile, account, billing, security
│   ├── api/
│   │   ├── assistant/chat/  → POST — main AI chat handler
│   │   ├── train/           → POST — trigger knowledge retrain
│   │   ├── products/        → GET/POST + [id] PATCH/DELETE
│   │   ├── faqs/            → GET/POST
│   │   ├── policies/        → GET/PUT
│   │   ├── payments/        → GET/POST
│   │   ├── leads/           → GET/PATCH + /export GET (CSV)
│   │   ├── conversations/   → GET
│   │   ├── health/          → GET — uptime / DB check
│   │   └── webhook/
│   │       ├── whatsapp/    → GET (verify) + POST (messages)
│   │       └── paystack/    → POST (subscription events)
│   ├── error.tsx            → global error boundary
│   ├── not-found.tsx        → 404 page
│   └── loading.tsx          → dashboard skeleton
├── components/
│   ├── ui/                  → Badge, StatCard, ErrorBoundary
│   └── dashboard/           → Sidebar, Topbar
├── hooks/
│   ├── useTenant.ts
│   ├── useAssistant.ts
│   └── useRealtimeLeads.ts
├── lib/
│   ├── supabase/            → browser / server / admin clients
│   ├── ai/
│   │   ├── rag.ts           → embed → retrieve → prompt → GPT-4o-mini
│   │   └── train.ts         → chunk → embed → upsert knowledge chunks
│   └── utils/
│       ├── cn.ts            → Tailwind class merger
│       ├── rateLimit.ts     → token bucket rate limiter
│       ├── apiResponse.ts   → standardised JSON response helpers
│       └── getIp.ts         → Vercel-aware client IP extraction
├── middleware.ts             → auth guard + route protection
└── types/index.ts            → all TypeScript types
supabase/
├── migrations/              → 4 SQL migration files
└── functions/
    ├── reset-monthly-usage/ → cron: resets msg_used on 1st of month
    └── notify-lead/         → webhook: emails owner on new lead
public/
└── widget/leenco.js         → embeddable chat widget (zero deps)
```

---

## Running tests

```bash
# Unit + integration tests
npm test

# Watch mode
npm run test:watch

# E2E tests (requires running dev server)
npm run test:e2e

# Type checking
npm run type-check
```

---

## AI pipeline

```
Customer message
       ↓
Embed with text-embedding-3-small → 1536-dim vector
       ↓
pgvector cosine search → top 5 knowledge chunks
       ↓
Build prompt: [persona] + [rules] + [retrieved chunks] + [history]
       ↓
GPT-4o-mini (temp=0.4, max_tokens=512)
       ↓
Score confidence from chunk similarity
       ↓
Save message + confScore → return to customer
       ↓
Auto-capture lead if contact info shared
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete step-by-step guide.

## Security

See [SECURITY.md](./SECURITY.md) for the full security audit and recommendations.

---

## License

MIT © Leen-Co AI
