-- ============================================================
-- Leen-Co AI — Fix auth signup when the public users table is auto-created
-- ============================================================

alter table users
  alter column tenant_id drop not null;
