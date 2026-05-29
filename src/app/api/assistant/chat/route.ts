import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/rag";
import { rateLimit, RATE_LIMITS } from "@/lib/utils/rateLimit";
import { getIp } from "@/lib/utils/getIp";
import { extractContact } from "@/lib/utils/extractContact";
import { err, zodErr, rateLimited, notFound, serverError } from "@/lib/utils/apiResponse";
import { z } from "zod";

const ChatSchema = z.object({
  tenantId:       z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message:        z.string().min(1).max(2000),
  channel:        z.enum(["website","whatsapp","instagram","api"]).default("website"),
  visitorName:    z.string().max(100).optional(),
  visitorEmail:   z.string().email().optional(),
  visitorPhone:   z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  // ── 1. Rate limit by IP ─────────────────────────────────────
  const ip     = getIp(request);
  const limit  = rateLimit(`chat:${ip}`, RATE_LIMITS.chat);
  if (!limit.allowed) return rateLimited(limit.resetInMs);

  try {
    const body  = ChatSchema.parse(await request.json());
    const supabase = createAdminClient();

    // ── 2. Load + validate tenant ───────────────────────────────
    const { data: tenant } = await supabase
      .from("tenants").select("id,name,plan,msg_used,msg_limit,is_active")
      .eq("id", body.tenantId).single();

    if (!tenant)           return notFound("Business");
    if (!tenant.is_active) return err("This assistant is currently inactive", 403);
    if (tenant.msg_used >= tenant.msg_limit)
      return err("Message limit reached. Please contact the business directly.", 429);

    // ── 3. Load assistant config ────────────────────────────────
    const { data: assistant } = await supabase
      .from("assistants").select("*").eq("tenant_id", body.tenantId).single();

    if (!assistant?.is_live) return notFound("Assistant");

    // ── 4. Get or create conversation ──────────────────────────
    let convId = body.conversationId;
    if (!convId) {
      const { data: conv } = await supabase.from("conversations")
        .insert({
          tenant_id:     body.tenantId,
          channel:       body.channel,
          visitor_name:  body.visitorName  ?? null,
          visitor_email: body.visitorEmail ?? null,
          visitor_phone: body.visitorPhone ?? null,
        }).select("id").single();
      convId = conv?.id;
    }
    if (!convId) return serverError("conv_create_failed", "chat");

    // ── 5. Load message history (last 20 turns) ─────────────────
    const { data: history } = await supabase.from("messages")
      .select("role,content").eq("conversation_id", convId)
      .order("created_at", { ascending: true }).limit(20);

    const messages = (history ?? []).map(m => ({
      role: m.role as "user" | "assistant", content: m.content,
    }));

    // ── 6. Save user message ────────────────────────────────────
    await supabase.from("messages")
      .insert({ conversation_id: convId, role: "user", content: body.message });

    // ── 7. RAG + OpenAI ─────────────────────────────────────────
    const { content, confScore } = await chat({
      tenantId:    body.tenantId,
      tenantName:  tenant.name,
      assistant,
      messages,
      userMessage: body.message,
    });

    // ── 8. Save AI reply ────────────────────────────────────────
    await supabase.from("messages").insert({
      conversation_id: convId, role: "assistant",
      content, conf_score: confScore,
    });

    // ── 9. Auto-capture lead — merge explicit fields, extracted-from-text,
    //       and what's already on the conversation row. Lead requires a name
    //       plus at least one of email/phone. Contact info accumulates across
    //       turns: a name in turn 1 + a phone in turn 2 still creates a lead.
    const extracted = extractContact(body.message);
    const { data: convRow } = await supabase.from("conversations")
      .select("visitor_name, visitor_email, visitor_phone, lead_captured")
      .eq("id", convId).single();

    const persistUpdate: Record<string, string> = {};
    if (!convRow?.visitor_name  && (body.visitorName  ?? extracted.name))  persistUpdate.visitor_name  = body.visitorName  ?? extracted.name!;
    if (!convRow?.visitor_email && (body.visitorEmail ?? extracted.email)) persistUpdate.visitor_email = body.visitorEmail ?? extracted.email!;
    if (!convRow?.visitor_phone && (body.visitorPhone ?? extracted.phone)) persistUpdate.visitor_phone = body.visitorPhone ?? extracted.phone!;

    if (Object.keys(persistUpdate).length > 0) {
      await supabase.from("conversations").update(persistUpdate).eq("id", convId);
    }

    const finalName  = convRow?.visitor_name  ?? persistUpdate.visitor_name  ?? null;
    const finalEmail = convRow?.visitor_email ?? persistUpdate.visitor_email ?? null;
    const finalPhone = convRow?.visitor_phone ?? persistUpdate.visitor_phone ?? null;

    if (!convRow?.lead_captured && finalName && (finalEmail || finalPhone)) {
      const { data: existing } = await supabase.from("leads")
        .select("id").eq("conversation_id", convId).maybeSingle();
      if (!existing) {
        await supabase.from("leads").insert({
          tenant_id:       body.tenantId,
          conversation_id: convId,
          full_name:       finalName,
          email:           finalEmail,
          phone:           finalPhone,
          temperature:     "warm",
          status:          "new",
        });
        await supabase.from("conversations")
          .update({ lead_captured: true })
          .eq("id", convId);
      }
    }

    // Flat shape — the widget, test sandbox, and documented REST contract all
    // read { message, conversationId, confScore } directly.
    return NextResponse.json({ conversationId: convId, message: content, confScore });

  } catch (e) {
    if (e instanceof z.ZodError) return zodErr(e);
    return serverError(e, "chat-route");
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
