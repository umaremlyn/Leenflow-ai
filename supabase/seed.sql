-- ─────────────────────────────────────────────────────────────
-- Leen-Co AI — Development seed data
-- Run after migrations: supabase db reset (auto-applies seed)
-- ─────────────────────────────────────────────────────────────

-- Test tenant
insert into tenants (id, name, slug, industry, plan, msg_limit)
values (
  '11111111-1111-1111-1111-111111111111',
  'Adunni Textiles',
  'adunni-textiles',
  'Retail / Fashion',
  'growth',
  5000
);

-- Test products
insert into products (tenant_id, name, description, price, currency, category, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Premium Ankara Fabric', 'High-quality 100% cotton ankara in various designs. Sold per yard. Minimum order 2 yards.', 2500, 'NGN', 'Fabric', true),
  ('11111111-1111-1111-1111-111111111111', 'Adire Fabric', 'Traditional hand-dyed adire fabric. Each piece is unique. Available in indigo and multicolour.', 3500, 'NGN', 'Fabric', true),
  ('11111111-1111-1111-1111-111111111111', 'Custom Tailoring', 'Full outfit tailoring service. Bring your fabric or buy from us. Takes 5–7 business days.', 15000, 'NGN', 'Services', true),
  ('11111111-1111-1111-1111-111111111111', 'Ready-to-Wear Boubou', 'Pre-made boubou in sizes S, M, L, XL, XXL. Available in green, blue, and red ankara.', 18000, 'NGN', 'Clothing', true);

-- Test FAQs
insert into faqs (tenant_id, question, answer, sort_order)
values
  ('11111111-1111-1111-1111-111111111111', 'How long does delivery take?', 'Lagos delivery takes 1–2 business days. Other states take 3–5 business days via GIG or DHL. We send tracking details via WhatsApp.', 1),
  ('11111111-1111-1111-1111-111111111111', 'Do you do bulk orders?', 'Yes! We offer bulk discounts from 10 yards and above. The more you order, the better your price. Contact us for a custom bulk quote.', 2),
  ('11111111-1111-1111-1111-111111111111', 'What is your return policy?', 'We accept returns within 14 days for unused fabric in original condition. Custom-made outfits are non-refundable. Buyer covers return shipping cost.', 3),
  ('11111111-1111-1111-1111-111111111111', 'Do you ship internationally?', 'Yes, we ship to the UK, USA, and Canada. International delivery takes 7–14 days. Shipping cost is calculated at checkout based on weight.', 4),
  ('11111111-1111-1111-1111-111111111111', 'Can I see samples before ordering?', 'We can send fabric swatches for orders above 20 yards. For smaller orders, please check our Instagram page for photos and videos.', 5);

-- Test policies
insert into policies (tenant_id, policy_type, content)
values
  ('11111111-1111-1111-1111-111111111111', 'returns', 'We accept returns within 14 days of purchase. Items must be unused, unwashed, and in original packaging with tags attached. To initiate a return, contact us on WhatsApp with your order number. Buyer is responsible for return shipping costs. Refunds are processed within 3–5 business days after we receive the item. Custom-made or tailored items are not eligible for returns.'),
  ('11111111-1111-1111-1111-111111111111', 'shipping', 'We deliver across Nigeria using GIG Logistics and DHL. Lagos delivery: 1–2 business days (₦1,500 flat). Other states: 3–5 business days (₦2,500–₦4,000 depending on state). Free delivery on orders above ₦50,000. International shipping available to UK, USA, Canada — 7–14 business days (cost calculated at checkout). All orders are tracked. Tracking number sent via WhatsApp after dispatch.'),
  ('11111111-1111-1111-1111-111111111111', 'hours', 'Monday to Friday: 9:00am – 6:00pm WAT. Saturday: 10:00am – 4:00pm WAT. Sunday: Closed. Public holidays: Closed. WhatsApp inquiries outside business hours will be attended to the next business day. Urgent orders can be arranged by prior appointment.');

-- Test payment info
insert into payment_info (tenant_id, method_type, instructions, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'bank_transfer',
   E'Bank: First Bank Nigeria\nAccount name: Adunni Textiles Limited\nAccount number: 3012345678\nSort code: 011\n\nAfter transfer:\n1. Take a screenshot of the transfer receipt\n2. Send it to +234 803 111 2233 on WhatsApp\n3. Include your full name and delivery address\n4. We will confirm your order within 30 minutes during business hours',
   true),
  ('11111111-1111-1111-1111-111111111111', 'paystack',
   E'Pay securely online with your debit card, credit card, or bank transfer via Paystack:\n1. We will send you a payment link via WhatsApp\n2. Click the link and enter your card details\n3. Complete the payment\n4. You will receive an automatic receipt\n5. We will process your order immediately after confirmation',
   true);

-- Test assistant config
update assistants
set
  name            = 'Leen',
  persona_tone    = 'friendly',
  greeting_msg    = 'Hi! I''m Leen, the AI assistant for Adunni Textiles. I can help you with product info, pricing, delivery, and orders. How can I help you today?',
  fallback_msg    = 'I''m not sure about that — let me connect you with our team. Please send a message to +234 803 111 2233 on WhatsApp and we''ll get back to you shortly.',
  language        = 'english',
  lead_capture_on = true,
  conf_threshold  = 0.55,
  is_live         = true
where tenant_id = '11111111-1111-1111-1111-111111111111';
