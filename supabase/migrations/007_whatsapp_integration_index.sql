-- ============================================================
-- Leen-Co AI — Index for multi-tenant WhatsApp webhook lookup
-- The webhook receives a phone_number_id and must resolve it to a tenant.
-- WhatsApp integration config is stored in tenant_integrations.config
-- as { phone_number_id, access_token, verify_token }.
-- ============================================================

create index if not exists tenant_integrations_wa_phone_id_idx
  on tenant_integrations ((config->>'phone_number_id'))
  where integration = 'whatsapp' and is_active = true;

create index if not exists tenant_integrations_wa_verify_token_idx
  on tenant_integrations ((config->>'verify_token'))
  where integration = 'whatsapp' and is_active = true;
