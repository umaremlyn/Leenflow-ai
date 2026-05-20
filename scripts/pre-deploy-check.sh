#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Leen-Co AI — Pre-deployment checklist
# Run: bash scripts/pre-deploy-check.sh
# ─────────────────────────────────────────────────────────────
PASS=0; FAIL=0; WARN=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}  ✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}  ✗${NC} $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; WARN=$((WARN+1)); }

echo ""
echo "══════════════════════════════════════════════"
echo "  Leen-Co AI — Pre-deployment Checklist"
echo "══════════════════════════════════════════════"

echo ""
echo "▸ Environment variables"
for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY OPENAI_API_KEY NEXT_PUBLIC_APP_URL; do
  [ -n "${!var}" ] && pass "$var is set" || fail "$var is NOT set (required)"
done
for var in PAYSTACK_SECRET_KEY WHATSAPP_ACCESS_TOKEN RESEND_API_KEY; do
  [ -n "${!var}" ] && pass "$var is set" || warn "$var not set (optional)"
done

echo ""
echo "▸ Node.js version"
NODE_VER=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -n "$NODE_VER" ] && [ "$NODE_VER" -ge 18 ]; then
  pass "Node.js $(node -v) — OK"
else
  fail "Node.js v18+ required"
fi

echo ""
echo "▸ Required files"
for f in "next.config.ts" "vercel.json" "src/middleware.ts" "src/lib/ai/rag.ts" "src/lib/ai/train.ts" \
         "supabase/migrations/001_initial_schema.sql" "supabase/migrations/002_vector_search.sql" \
         "public/widget/leenco.js"; do
  [ -f "$f" ] && pass "$f" || fail "$f MISSING"
done

echo ""
echo "▸ Secrets safety"
if git -C . ls-files --error-unmatch .env.local 2>/dev/null; then
  fail ".env.local is tracked by git — DANGER!"
else
  pass ".env.local is not committed"
fi

echo ""
echo "══════════════════════════════════════════════"
echo -e "  Passed: ${GREEN}$PASS${NC}  Warnings: ${YELLOW}$WARN${NC}  Failed: ${RED}$FAIL${NC}"
echo "══════════════════════════════════════════════"
[ $FAIL -gt 0 ] && exit 1 || exit 0
