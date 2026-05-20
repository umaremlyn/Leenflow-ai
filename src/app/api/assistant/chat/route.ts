import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/rag";
import { rateLimit, RATE_LIMITS } from "@/lib/utils/rateLimit";
import { getIp } from "@/lib/utils/getIp";
import { ok, err, zodErr, rateLimited, notFound, serverError } from "@/lib/utils/apiResponse";
import { z } from "zod";

const ChatSchema = z.object({
  tenantId:       z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message:        z.string().min(1).max(2000),
  channel:        z.enum(["website","whatsapp","instagram","api"]).default("website"),
  visitorName:    z.string().max(100).optional(),
  visitorEmail:   z.string().email().optional(),
  visitorPhone:   z.string().max(30).optional(),
});

export async function POST(request: NextRequest) {
  // 1. Rate limiting — per IP
  const ip     = getIp(request);
  const rl     = rateLimit(`chat:${ip}`, RATE_LIMITS.chat);
  if (!rl.allowed) return rateLimited(rl.resetInMs);

  try {
    // 2. Parse + validate body
    const body  = await request.json().catch(() => null);
    if (!body)  return err("Invalid JSON body", 400);
    const input = ChatSchema.safeParse(body);
    if (!input.success) return zodErr(input.error);
    const { tenantId, conversationId: existingConvId, message,
            channel, visitorName, visitorEmail, visitorPhone } = input.data;

    const supabase = createAdminClient();

    // 3. Load tenant + enforce usage limits
    const { data: tenant } = await supabase
      .from("tenants").select("id,name,plan,msg_used,msg_limit,is_active")
      .eq("id", tenantId).single();

    if (!tenant)           return notFound("Business");
    if (!tenant.is_active) return err("This assistant is currently inactive", 403);
    if (tenant.msg_used >= tenant.msg_limit)
      return err("Message limit reached. Please contact the business directly.", 429);

    // 4. Load assistant config
    const { data: assistant } = await supabase
      .from("assistants").select("*").eq("tenant_id", tenantId).single();
    if (!assistant?.is_live) return notFound("Assistant");

    // 5. Get or create conversation
    let conversationId = existingConvId;
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ tenant_id: tenantId, channel,
                  visitor_name:  visitorName  ?? null,
                  visitor_email: visitorEmail ?? null,
                  visitor_phone: visitorPhone ?? null })
        .select("id").single();
      if (convErr || !conv) return serverError(convErr, "create conversation");
      conversationId = conv.id;
    }

    // 6. Fetch recent message history (last 20 turns)
    const { data: history } = await supabase
      .from("messages").select("role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }).limit(20);

    const messages = (history ?? []).map(m => ({
      role: m.role as "user" | "assistant", content: m.content,
    }));

    // 7. Store user message
    await supabase.from("messages").insert({
      conversation_id: conversationId, role: "user", content: message,
    });

    // 8. Run RAG + OpenAI
    const { content, confScore } = await chat({
      tenantId, tenantName: tenant.name, assistant, messages, userMessage: message,
    });

    // 9. Store AI reply
    await supabase.from("messages").insert({
      conversation_id: conversationId, role: "assistant",
      content, conf_score: confScore,
    });

    // 10. Auto-capture lead if contact info was provided
    if (visitorName && (visitorEmail || visitorPhone)) {
      const { data: existingLead } = await supabase
        .from("leads").select("id")
        .eq("conversation_id", conversationId).single();

      if (!existingLead) {
        await supabase.from("leads").insert({
          tenant_id:       tenantId,
          conversation_id: conversationId,
          full_name:       visitorName,
          email:           visitorEmail ?? null,
          phone:           visitorPhone ?? null,
          temperature:     "warm",
          status:          "new",
        });
        await supabase.from("conversations")
          .update({ lead_captured: true }).eq("id", conversationId);
      }
    }

    // 11. Set rate-limit headers on the response
    return NextResponse.json(
      { data: { conversationId, message: content, confScore }, error: null },
      { headers: { "X-RateLimit-Remaining": String(rl.remaining) } }
    );

  } catch (e) {
    return serverError(e, "chat route");
  }
}

// OPTIONS — required for CORS preflight from embedded widget
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
