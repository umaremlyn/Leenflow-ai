import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/rag";

// ── GET: Meta webhook verification ──────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: Incoming WhatsApp messages ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract the first message from the webhook payload
    const entry   = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value?.messages?.length) return NextResponse.json({ status: "no_message" });

    const msg          = value.messages[0];
    const phone        = msg.from;                           // WhatsApp sender number
    const text         = msg.text?.body ?? "";
    const phoneNumberId = value.metadata?.phone_number_id;

    if (!text || !phoneNumberId) return NextResponse.json({ status: "ignored" });

    const supabase = createAdminClient();

    // Find the tenant this phone number belongs to
    // In production: store phone_number_id per tenant in a settings table
    // Here we use WHATSAPP_PHONE_NUMBER_ID env for single-tenant demo
    if (phoneNumberId !== process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json({ status: "unknown_number" });
    }

    // Get tenant from env (in production: lookup by phoneNumberId)
    const tenantId = process.env.WHATSAPP_TENANT_ID;
    if (!tenantId) return NextResponse.json({ status: "no_tenant" });

    const { data: tenant }    = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    const { data: assistant } = await supabase.from("assistants").select("*").eq("tenant_id", tenantId).single();

    if (!tenant || !assistant?.is_live) return NextResponse.json({ status: "not_live" });

    // Get or create a conversation for this WhatsApp number
    let { data: conv } = await supabase.from("conversations")
      .select("id").eq("tenant_id", tenantId).eq("visitor_phone", phone).eq("channel", "whatsapp")
      .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // within 24h
      .single();

    if (!conv) {
      const { data: newConv } = await supabase.from("conversations")
        .insert({ tenant_id: tenantId, channel: "whatsapp", visitor_phone: phone })
        .select("id").single();
      conv = newConv;
    }

    if (!conv) return NextResponse.json({ status: "conv_error" });

    // Load recent history
    const { data: history } = await supabase.from("messages").select("role, content")
      .eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(20);

    // Save incoming message
    await supabase.from("messages").insert({ conversation_id: conv.id, role: "user", content: text });

    // Generate AI reply
    const { content, confScore } = await chat({
      tenantId,
      tenantName:  tenant.name,
      assistant,
      messages:    (history ?? []).map(m => ({ role: m.role as "user"|"assistant", content: m.content })),
      userMessage: text,
    });

    // Save AI reply
    await supabase.from("messages").insert({ conversation_id: conv.id, role: "assistant", content, conf_score: confScore });

    // Send reply via WhatsApp Cloud API
    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to:                phone,
        type:              "text",
        text:              { body: content },
      }),
    });

    return NextResponse.json({ status: "sent" });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
