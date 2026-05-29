import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/rag";

type WhatsAppConfig = {
  phone_number_id: string;
  access_token:    string;
  verify_token:    string;
};

// ── GET: Meta webhook verification ──────────────────────────
// Each tenant uses their tenant_id as the verify_token, configured at /integrations.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tenant_integrations")
    .select("id")
    .eq("integration", "whatsapp")
    .eq("is_active", true)
    .filter("config->>verify_token", "eq", token)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log("[WhatsApp Webhook] Verification successful for integration", data.id);
  return new NextResponse(challenge, { status: 200 });
}

// ── POST: Incoming WhatsApp messages ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages?.length) return NextResponse.json({ status: "no_message" });

    const msg           = value.messages[0];
    const phone         = msg.from;
    const text          = msg.text?.body ?? "";
    const phoneNumberId = value.metadata?.phone_number_id;

    if (!text || !phoneNumberId) return NextResponse.json({ status: "ignored" });

    const supabase = createAdminClient();

    // Resolve tenant by phone_number_id (indexed lookup in tenant_integrations.config)
    const { data: integration } = await supabase
      .from("tenant_integrations")
      .select("tenant_id, config, is_active")
      .eq("integration", "whatsapp")
      .eq("is_active", true)
      .filter("config->>phone_number_id", "eq", phoneNumberId)
      .maybeSingle();

    if (!integration) return NextResponse.json({ status: "unknown_number" });

    const tenantId = integration.tenant_id;
    const cfg      = integration.config as WhatsAppConfig;

    const { data: tenant }    = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    const { data: assistant } = await supabase.from("assistants").select("*").eq("tenant_id", tenantId).single();

    if (!tenant || !assistant?.is_live) return NextResponse.json({ status: "not_live" });

    // Get or create a conversation for this WhatsApp number (24h window)
    let { data: conv } = await supabase.from("conversations")
      .select("id").eq("tenant_id", tenantId).eq("visitor_phone", phone).eq("channel", "whatsapp")
      .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase.from("conversations")
        .insert({ tenant_id: tenantId, channel: "whatsapp", visitor_phone: phone })
        .select("id").single();
      conv = newConv;
    }

    if (!conv) return NextResponse.json({ status: "conv_error" });

    const { data: history } = await supabase.from("messages").select("role, content")
      .eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(20);

    await supabase.from("messages").insert({ conversation_id: conv.id, role: "user", content: text });

    const { content, confScore } = await chat({
      tenantId,
      tenantName:  tenant.name,
      assistant,
      messages:    (history ?? []).map(m => ({ role: m.role as "user"|"assistant", content: m.content })),
      userMessage: text,
    });

    await supabase.from("messages").insert({ conversation_id: conv.id, role: "assistant", content, conf_score: confScore });

    // Send reply via WhatsApp Cloud API using the tenant's own access token
    const sendRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${cfg.access_token}`,
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

    if (!sendRes.ok) {
      const errBody = await sendRes.text().catch(() => "");
      console.error("[WhatsApp Webhook] Send failed", sendRes.status, errBody);
      return NextResponse.json({ status: "send_failed" }, { status: 502 });
    }

    return NextResponse.json({ status: "sent" });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
