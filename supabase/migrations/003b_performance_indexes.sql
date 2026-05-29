-- ============================================================
-- Leen-Co AI — Performance Indexes & Query Optimisation
-- ============================================================

-- ── Tenants ──────────────────────────────────────────────────
create index if not exists tenants_slug_idx
  on tenants (slug);

create index if not exists tenants_plan_idx
  on tenants (plan) where is_active = true;

-- ── Users ────────────────────────────────────────────────────
create index if not exists users_email_idx
  on users (email);

create index if not exists users_tenant_role_idx
  on users (tenant_id, role);

-- ── Knowledge chunks ─────────────────────────────────────────
-- Composite index for fast tenant-scoped chunk lookups
create index if not exists kc_tenant_source_idx
  on knowledge_chunks (tenant_id, source_type, source_id);

-- ── Conversations ─────────────────────────────────────────────
create index if not exists conv_tenant_channel_idx
  on conversations (tenant_id, channel);

create index if not exists conv_visitor_phone_idx
  on conversations (tenant_id, visitor_phone)
  where visitor_phone is not null;

-- ── Messages ─────────────────────────────────────────────────
create index if not exists msg_conv_created_idx
  on messages (conversation_id, created_at asc);

-- ── Leads ────────────────────────────────────────────────────
create index if not exists leads_tenant_temp_idx
  on leads (tenant_id, temperature);

create index if not exists leads_tenant_status_idx
  on leads (tenant_id, status);

-- ── Subscriptions ─────────────────────────────────────────────
create index if not exists subs_paystack_idx
  on subscriptions (paystack_sub_id)
  where paystack_sub_id is not null;

-- ── Message count materialised view ──────────────────────────
-- Fast daily conversation count for analytics
create or replace view daily_conversation_counts as
  select
    tenant_id,
    date_trunc('day', started_at) as day,
    channel,
    count(*)                      as total,
    count(*) filter (where lead_captured) as leads
  from conversations
  group by tenant_id, date_trunc('day', started_at), channel;
