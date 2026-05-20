-- ============================================================
-- Leen-Co AI — Initial Database Schema
-- Run: supabase db push
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ─── TENANTS (businesses) ────────────────────────────────────
create table tenants (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  industry      text,
  logo_url      text,
  plan          text not null default 'starter' check (plan in ('starter','growth','enterprise')),
  msg_used      integer not null default 0,
  msg_limit     integer not null default 500,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── USERS ────────────────────────────────────────────────────
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          text not null default 'owner' check (role in ('owner','admin','staff')),
  created_at    timestamptz not null default now()
);

-- ─── ASSISTANTS ───────────────────────────────────────────────
create table assistants (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null unique references tenants(id) on delete cascade,
  name            text not null default 'Leen',
  persona_tone    text not null default 'friendly' check (persona_tone in ('friendly','professional','formal','casual')),
  greeting_msg    text not null default 'Hi! How can I help you today?',
  fallback_msg    text not null default 'I''m not sure about that. Let me connect you with our team.',
  language        text not null default 'english',
  lead_capture_on boolean not null default true,
  conf_threshold  float not null default 0.6,
  is_live         boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- ─── PRODUCTS & SERVICES ──────────────────────────────────────
create table products (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  description   text,
  price         decimal(12,2),
  currency      text not null default 'NGN',
  category      text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── FAQs ─────────────────────────────────────────────────────
create table faqs (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  question      text not null,
  answer        text not null,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── POLICIES ─────────────────────────────────────────────────
create table policies (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  policy_type   text not null check (policy_type in ('returns','shipping','privacy','terms','hours','custom')),
  content       text not null,
  updated_at    timestamptz not null default now(),
  unique (tenant_id, policy_type)
);

-- ─── PAYMENT INFO ─────────────────────────────────────────────
create table payment_info (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  method_type   text not null check (method_type in ('bank_transfer','paystack','opay','cash','custom')),
  instructions  text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── KNOWLEDGE CHUNKS (RAG vector store) ─────────────────────
create table knowledge_chunks (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  source_type   text not null check (source_type in ('product','faq','policy','payment','document')),
  source_id     uuid not null,
  content       text not null,
  embedding     vector(1536),
  conf_score    float not null default 1.0,
  indexed_at    timestamptz not null default now()
);

-- Efficient similarity search index
create index knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index knowledge_chunks_tenant_idx on knowledge_chunks(tenant_id);

-- ─── CONVERSATIONS ────────────────────────────────────────────
create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  channel         text not null default 'website' check (channel in ('website','whatsapp','instagram','api')),
  visitor_name    text,
  visitor_email   text,
  visitor_phone   text,
  lead_captured   boolean not null default false,
  msg_count       integer not null default 0,
  started_at      timestamptz not null default now()
);

create index conversations_tenant_idx on conversations(tenant_id);
create index conversations_started_at_idx on conversations(started_at desc);

-- ─── MESSAGES ─────────────────────────────────────────────────
create table messages (
  id                uuid primary key default uuid_generate_v4(),
  conversation_id   uuid not null references conversations(id) on delete cascade,
  role              text not null check (role in ('user','assistant')),
  content           text not null,
  conf_score        float,
  created_at        timestamptz not null default now()
);

create index messages_conversation_idx on messages(conversation_id);

-- ─── LEADS ────────────────────────────────────────────────────
create table leads (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  conversation_id   uuid references conversations(id) on delete set null,
  full_name         text not null,
  email             text,
  phone             text,
  temperature       text not null default 'warm' check (temperature in ('hot','warm','cold')),
  status            text not null default 'new' check (status in ('new','contacted','converted','lost')),
  captured_at       timestamptz not null default now()
);

create index leads_tenant_idx on leads(tenant_id);
create index leads_captured_at_idx on leads(captured_at desc);

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────
create table subscriptions (
  id                    uuid primary key default uuid_generate_v4(),
  tenant_id             uuid not null unique references tenants(id) on delete cascade,
  plan                  text not null default 'starter',
  paystack_sub_id       text,
  status                text not null default 'trialing' check (status in ('active','cancelled','past_due','trialing')),
  current_period_end    timestamptz
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
alter table tenants        enable row level security;
alter table users          enable row level security;
alter table assistants     enable row level security;
alter table products       enable row level security;
alter table faqs           enable row level security;
alter table policies       enable row level security;
alter table payment_info   enable row level security;
alter table knowledge_chunks enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table leads          enable row level security;
alter table subscriptions  enable row level security;

-- Helper function: get current user's tenant_id
create or replace function get_tenant_id()
returns uuid language sql stable as $$
  select tenant_id from users where id = auth.uid()
$$;

-- RLS policies — users can only access their own tenant's data
create policy "tenant_isolation" on tenants
  for all using (id = get_tenant_id());

create policy "tenant_isolation" on users
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on assistants
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on products
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on faqs
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on policies
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on payment_info
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on knowledge_chunks
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on conversations
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on leads
  for all using (tenant_id = get_tenant_id());

create policy "tenant_isolation" on subscriptions
  for all using (tenant_id = get_tenant_id());

-- Messages are accessible via their conversation's tenant
create policy "tenant_isolation" on messages
  for all using (
    conversation_id in (
      select id from conversations where tenant_id = get_tenant_id()
    )
  );

-- ─── FUNCTIONS & TRIGGERS ─────────────────────────────────────

-- Auto-increment message count on conversation
create or replace function increment_msg_count()
returns trigger language plpgsql as $$
begin
  update conversations
  set msg_count = msg_count + 1
  where id = NEW.conversation_id;
  return NEW;
end;
$$;

create trigger on_message_insert
  after insert on messages
  for each row execute function increment_msg_count();

-- Auto-increment tenant message usage
create or replace function increment_msg_usage()
returns trigger language plpgsql as $$
begin
  if NEW.role = 'assistant' then
    update tenants
    set msg_used = msg_used + 1
    where id = (
      select tenant_id from conversations where id = NEW.conversation_id
    );
  end if;
  return NEW;
end;
$$;

create trigger on_assistant_message_insert
  after insert on messages
  for each row execute function increment_msg_usage();

-- Auto-create assistant row when tenant is created
create or replace function create_default_assistant()
returns trigger language plpgsql as $$
begin
  insert into assistants (tenant_id, name, greeting_msg)
  values (
    NEW.id,
    'Leen',
    'Hi! I''m Leen, the AI assistant for ' || NEW.name || '. How can I help you today?'
  );
  return NEW;
end;
$$;

create trigger on_tenant_created
  after insert on tenants
  for each row execute function create_default_assistant();
