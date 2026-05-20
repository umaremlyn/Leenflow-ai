-- ── Billing events log ──────────────────────────────────────
create table if not exists billing_events (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  event_type      text not null,   -- e.g. 'subscription.create', 'charge.success'
  paystack_ref    text,
  amount_kobo     integer,         -- amount in kobo (NGN smallest unit)
  payload         jsonb,
  created_at      timestamptz not null default now()
);

alter table billing_events enable row level security;
create policy "tenant_isolation" on billing_events for all using (tenant_id = get_tenant_id());

-- ── Tenant integrations (WhatsApp, etc.) ────────────────────
create table if not exists tenant_integrations (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  integration     text not null,   -- 'whatsapp', 'instagram', 'api_key'
  config          jsonb not null default '{}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (tenant_id, integration)
);

alter table tenant_integrations enable row level security;
create policy "tenant_isolation" on tenant_integrations for all using (tenant_id = get_tenant_id());
