-- ============================================================
-- Leen-Co AI — Development Seed Data
-- Run ONLY in development / staging environments
-- ============================================================

-- Only seed if no tenants exist yet
do $$
begin
  if (select count(*) from tenants) = 0 then

    -- Demo tenant
    insert into tenants (id, name, slug, industry, plan, msg_used, msg_limit)
    values (
      '11111111-1111-1111-1111-111111111111',
      'Adunni Textiles',
      'adunni-textiles',
      'Retail / Fashion',
      'growth',
      47,
      5000
    );

    -- Demo assistant (trigger creates it, but override with good defaults)
    update assistants
    set
      name         = 'Leen',
      persona_tone = 'friendly',
      greeting_msg = 'Hi! I''m Leen, the AI assistant for Adunni Textiles. How can I help you today?',
      fallback_msg = 'I''m not sure about that. Let me connect you with our team.',
      language     = 'english',
      is_live      = true
    where tenant_id = '11111111-1111-1111-1111-111111111111';

    -- Demo products
    insert into products (tenant_id, name, description, price, currency, category, is_active)
    values
      ('11111111-1111-1111-1111-111111111111', 'Premium Ankara Fabric',
       'High-quality 100% cotton ankara fabric. Available in 6-yard bundles. Over 50 designs in stock.',
       4500, 'NGN', 'Fabric', true),
      ('11111111-1111-1111-1111-111111111111', 'Adire Tie-Dye Fabric',
       'Hand-dyed adire fabric in traditional Yoruba patterns. Each piece is unique. Sold per yard.',
       2800, 'NGN', 'Fabric', true),
      ('11111111-1111-1111-1111-111111111111', 'Custom Tailoring Service',
       'We tailor traditional and contemporary outfits. Price depends on complexity. Turnaround: 5-7 days.',
       null, 'NGN', 'Services', true);

    -- Demo FAQs
    insert into faqs (tenant_id, question, answer, sort_order)
    values
      ('11111111-1111-1111-1111-111111111111',
       'How long does delivery take?',
       'Lagos orders arrive in 1-2 business days. Other states take 3-5 business days via GIG Logistics.',
       1),
      ('11111111-1111-1111-1111-111111111111',
       'Do you do bulk orders?',
       'Yes! We accept bulk orders from 10 yards and above. Bulk orders get 10-20% discount depending on quantity. Contact us for a custom quote.',
       2),
      ('11111111-1111-1111-1111-111111111111',
       'What is your return policy?',
       'We accept returns within 14 days for unused fabric in original condition. Custom-tailored items are non-refundable. Contact us on WhatsApp to initiate a return.',
       3),
      ('11111111-1111-1111-1111-111111111111',
       'Do you ship outside Nigeria?',
       'Yes, we ship to Ghana, UK, US, and Canada. International shipping takes 7-14 days via DHL. Rates vary by destination.',
       4);

    -- Demo payment info
    insert into payment_info (tenant_id, method_type, instructions, is_active)
    values
      ('11111111-1111-1111-1111-111111111111', 'bank_transfer',
       E'Bank: Zenith Bank\nAccount name: Adunni Textiles Ltd\nAccount number: 1234567890\n\nAfter payment, send your receipt + order details to 08012345678 on WhatsApp for confirmation.',
       true),
      ('11111111-1111-1111-1111-111111111111', 'paystack',
       E'Pay securely with debit/credit card:\n1. We will send you a payment link via WhatsApp\n2. Click the link and enter your card details\n3. Payment is processed securely by Paystack\n4. Send your receipt to confirm your order',
       true);

    -- Demo policy
    insert into policies (tenant_id, policy_type, content)
    values
      ('11111111-1111-1111-1111-111111111111', 'hours',
       'Monday to Friday: 8am – 7pm\nSaturday: 9am – 5pm\nSunday: Closed\nPublic holidays: Closed\n\nWhatsApp orders are accepted 24/7 but processed during business hours.');

    raise notice 'Seed data created for Adunni Textiles (tenant: 11111111-1111-1111-1111-111111111111)';
  else
    raise notice 'Tenants exist — skipping seed';
  end if;
end $$;
