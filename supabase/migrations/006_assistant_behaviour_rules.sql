-- ============================================================
-- Leen-Co AI — Persist AI Assistant "Behaviour" toggles
-- ============================================================

alter table assistants
  add column if not exists behaviour_rules jsonb not null default jsonb_build_object(
    'capture_lead_before_pricing', true,
    'escalate_on_low_confidence',  true,
    'only_business_topics',        true,
    'show_payment_steps',          true,
    'after_hours_response',        false
  );
