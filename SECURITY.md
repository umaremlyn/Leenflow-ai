# Leen-Co AI — Security Audit Report

## Threat model
Multi-tenant SaaS handling business data, customer conversations, and payment instructions.
Primary threats: tenant data leakage, API abuse, injection attacks, unauthorised access.

---

## Layer-by-layer audit

### ✅ Authentication (Supabase Auth)
| Check | Status | Notes |
|---|---|---|
| JWT-based sessions | ✅ Pass | Supabase handles token signing + verification |
| Session refresh in middleware | ✅ Pass | `supabase.auth.getUser()` called on every request |
| Password minimum length | ✅ Pass | Enforced at 8 chars (Supabase default: 6 — override in dashboard) |
| Auth pages redirect authenticated users | ✅ Pass | Middleware redirects `/login` → `/dashboard` |

**Action:** Set Supabase Auth minimum password length to 12 in your dashboard.

---

### ✅ Multi-tenancy isolation (Row Level Security)
| Check | Status | Notes |
|---|---|---|
| RLS enabled on all tables | ✅ Pass | All 12 tables have RLS enabled |
| Tenant isolation policy on all tables | ✅ Pass | `get_tenant_id()` helper used consistently |
| Service role key only used server-side | ✅ Pass | `createAdminClient()` only in API routes / Edge Functions |
| Anon key never exposed in admin contexts | ✅ Pass | Browser client uses anon key; admin client uses service role |

---

### ✅ API security
| Check | Status | Notes |
|---|---|---|
| All protected routes require auth | ✅ Pass | Middleware enforces `auth.getUser()` check |
| Rate limiting on chat endpoint | ✅ Pass | 30 req/min per IP (token bucket) |
| Rate limiting on train endpoint | ✅ Pass | 5 req/min per tenant |
| Input validation with Zod | ✅ Pass | All API routes validate with Zod before processing |
| UUID validation on all ID params | ✅ Pass | `z.string().uuid()` prevents injection via IDs |
| Message length cap | ✅ Pass | 2000 chars max prevents token stuffing |
| CORS restricted on dashboard routes | ✅ Pass | Only `/api/assistant/*` and `/widget/*` are open |
| Webhook signature verification (Paystack) | ✅ Pass | HMAC-SHA512 verified before processing |
| WhatsApp verify token check | ✅ Pass | Token matched before confirming webhook |

---

### ✅ Security headers
| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Strict-Transport-Security` | `max-age=31536000` | Forces HTTPS |
| `Content-Security-Policy` | Scoped | Prevents XSS, restricts resource origins |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | Camera/mic/geo denied | Limits browser capability abuse |
| `X-Powered-By` | Removed | Hides Next.js version |

---

### ✅ Data handling
| Check | Status | Notes |
|---|---|---|
| No secrets in client-side code | ✅ Pass | All secrets in server-only files |
| OpenAI API key server-only | ✅ Pass | Only accessed in `/src/lib/ai/` |
| Supabase service role key server-only | ✅ Pass | Only in `createAdminClient()` |
| Paystack secret key server-only | ✅ Pass | Only in webhook handler |
| `.env.local` in `.gitignore` | ✅ Pass | Never committed to git |

---

### ⚠️ Known limitations & recommendations

| Item | Priority | Recommendation |
|---|---|---|
| Rate limiter is in-memory | Medium | For multi-instance deployments, migrate to Upstash Redis |
| No email verification enforcement | Medium | Enable "Confirm email" in Supabase Auth → Email settings |
| No 2FA option for business owners | Low | Add TOTP 2FA via Supabase Auth in a future release |
| Audit log for knowledge base changes | Low | Log who changed what (user, timestamp, before/after) |
| GDPR data deletion | Medium | Build a "Delete my data" flow that removes tenant + all linked rows |
| OpenAI data retention | Low | Review OpenAI's data usage policy and add disclosure to ToS |
| WhatsApp rate limiting | Medium | Add per-sender rate limiting to prevent single user spamming |

---

## NDPR (Nigeria Data Protection Regulation) compliance notes
- Customer contact data (name, email, phone) is captured only with conversational consent
- Data is stored in Supabase (can be configured to EU/US regions)
- Businesses must add a privacy notice to their website when using the widget
- Include a data retention policy in your Terms of Service
- Provide a mechanism for customers to request data deletion

