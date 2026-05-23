# Leen-Co AI — Deployment & Operations Guide

## Pre-deployment checklist

### 1. Supabase project setup
```bash
# Create a new project at supabase.com
# Then run all migrations IN ORDER in the Supabase SQL editor:

# 1. Core schema + RLS
supabase/migrations/001_initial_schema.sql

# 2. Vector search function
supabase/migrations/002_vector_search.sql

# 3. Performance indexes
supabase/migrations/003_performance_indexes.sql

# 4. Dev seed data (SKIP in production)
# supabase/migrations/004_seed_dev.sql
```

**Required Supabase settings:**
- Enable the `vector` extension: Dashboard → Database → Extensions → vector → Enable
- Enable Realtime on the `leads` table: Dashboard → Database → Replication → leads → Enable
- Set SMTP for auth emails: Dashboard → Authentication → Email Settings

---

### 2. Environment variables (Vercel dashboard)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key ⚠️ keep secret |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack Dashboard → Settings → API Keys |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard → Settings → API Keys ⚠️ keep secret |
| `WHATSAPP_ACCESS_TOKEN` | Meta Developer Console → WhatsApp → API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developer Console → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Any strong random string you choose |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | resend.com → Domains (must be a verified domain) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL (e.g. https://leenco.ai) |
| `NEXT_PUBLIC_APP_NAME` | `Leen-Co AI` |

---

### 3. Deploy to Vercel

**Option A — Vercel dashboard (recommended for first deploy):**
```
1. Push code to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Add all environment variables from the table above
4. Click Deploy
```

**Option B — CLI:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

### 4. Configure webhooks after deploy

**WhatsApp Business API:**
```
Meta Developer Console → Your App → WhatsApp → Configuration → Webhooks:
  Callback URL:   https://your-domain.com/api/webhook/whatsapp
  Verify Token:   [same value as WHATSAPP_VERIFY_TOKEN env var]
  Subscribe to:   messages
```

**Paystack:**
```
Paystack Dashboard → Settings → API Keys → Webhooks:
  URL: https://your-domain.com/api/webhook/paystack
  Events: subscription.create, subscription.disable, invoice.payment_failed
```

---

### 5. CI/CD — GitHub Actions secrets to add

```
VERCEL_ORG_ID        → vercel.com → Settings → General → Your ID
VERCEL_PROJECT_ID    → vercel.com → Project → Settings → General
VERCEL_TOKEN         → vercel.com → Settings → Tokens → Create

SUPABASE_URL         → same as NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY    → same as NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY → from Supabase

OPENAI_API_KEY       → from OpenAI
STAGING_URL          → your staging Vercel URL
TEST_EMAIL           → a seeded test account email
TEST_PASSWORD        → that test account's password
```

---

## Post-launch operations

### Monitor & observability
- **Vercel logs:** vercel.com → Project → Logs (real-time function logs)
- **Supabase logs:** Dashboard → Logs (DB queries, auth events, API calls)
- **Health endpoint:** GET https://your-domain.com/health
- **Uptime monitoring:** Add https://your-domain.com/health to UptimeRobot (free)

### Scaling considerations

| When... | Do this |
|---|---|
| >100 concurrent chat users | Switch rate limiter store from in-memory to Upstash Redis |
| OpenAI latency >3s | Add streaming responses using Vercel AI SDK `streamText()` |
| Vector search slow (>500ms) | Increase pgvector `lists` parameter: `ALTER INDEX ... SET (lists = 200)` |
| Supabase connection limit hit | Enable PgBouncer in Supabase (connection pooling) |
| WhatsApp rate limits hit | Add message queue (Supabase Edge Function + cron) |

### Monthly maintenance checklist
- [ ] Review unanswered questions in analytics — add FAQs for gaps
- [ ] Check AI resolution rate — if <75%, add more knowledge
- [ ] Review lead conversion — contacted vs converted ratio
- [ ] Monitor OpenAI usage (platform.openai.com/usage)
- [ ] Check Supabase storage usage
- [ ] Rotate API keys if any team members leave

### Backup strategy
Supabase automatically backs up your database daily on paid plans.
For additional safety, schedule a weekly export:
```bash
# Run from terminal (requires supabase CLI)
supabase db dump --file backup_$(date +%Y%m%d).sql
```

---

## Cost estimates (monthly at launch scale)

| Service | Free tier | Paid starts at |
|---|---|---|
| Vercel | 100GB bandwidth, unlimited deploys | $20/mo (Pro) |
| Supabase | 500MB DB, 1GB storage, 50K MAU | $25/mo (Pro) |
| OpenAI | Pay-per-use | ~$5–20/mo for 5K messages (gpt-4o-mini) |
| Resend | 3,000 emails/mo | $20/mo |
| **Total estimate** | **$0 (early stage)** | **~$50–80/mo at growth** |

---

## Security incident response

1. **Leaked API key** → Rotate immediately in the respective dashboard + update Vercel env vars
2. **Suspected data breach** → Disable affected tenant in Supabase dashboard immediately, then investigate
3. **DDoS / abuse** → Block IP at Vercel edge (add to `vercel.json` → `headers` → `source` with `x-forwarded-for` check)
4. **Compromised service account** → Supabase → Authentication → Users → Disable user

---

## Useful commands

```bash
# Run all tests
npm test

# Run E2E tests against local dev server
npm run test:e2e

# Check TypeScript errors
npm run type-check

# Lint
npm run lint

# Run migrations on production Supabase
supabase db push --db-url postgresql://postgres:[password]@[host]:5432/postgres

# Generate TypeScript types from your live Supabase schema
npm run db:types

# Analyse bundle size
npm run analyze
```
