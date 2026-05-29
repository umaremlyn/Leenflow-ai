import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Assistant } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Embed text using OpenAI text-embedding-3-small ─────────
// Produces 1536-dim vectors — matches our pgvector schema exactly
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " ").trim(),
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

// ─── Retrieve relevant knowledge chunks via vector search ────
export async function retrieveContext(
  tenantId: string,
  query: string,
  topK = 5
): Promise<Array<{ content: string; source_type: string; conf_score: number }>> {
  try {
    const supabase = createAdminClient();
    const queryEmbedding = await embedText(query);

    // The RPC takes float8[] and casts to vector(1536) — see migration 009.
    // Pass the raw array; do not convert to a literal string.
    //
    // Threshold note: text-embedding-3-small produces lower raw cosine
    // similarity than older models (older OpenAI ada-002 cohort sat ~0.6+
    // for relevant matches; 3-small typically lands at 0.15–0.35 for
    // relevant matches and ~0.05 for unrelated). 0.15 filters truly
    // unrelated content while surfacing real semantic hits.
    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      p_tenant_id:   tenantId,
      p_embedding:   queryEmbedding,
      p_match_count: topK,
      p_threshold:   0.15,
    });

    if (error) {
      console.error("[RAG] match_knowledge_chunks error:", error.message);
      return [];
    }
    if (!data || data.length === 0) {
      // Diagnose empty results — is the tenant's knowledge base empty, or is
      // the similarity threshold too strict?
      const { count } = await supabase
        .from("knowledge_chunks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      console.warn(`[RAG] empty retrieval for tenant=${tenantId} query="${query.slice(0,60)}" — total chunks in DB: ${count ?? 0}`);

      // If chunks exist, dump their actual similarity scores — this tells
      // us whether the embeddings are bad (~0 similarity) or just below the
      // 0.45 threshold.
      if ((count ?? 0) > 0) {
        const { data: debug, error: debugErr } = await supabase.rpc("debug_top_chunks", {
          p_tenant_id:   tenantId,
          p_embedding:   queryEmbedding,
          p_match_count: 3,
        });
        if (debugErr) {
          console.warn(`[RAG] debug_top_chunks error: ${debugErr.message} — run migration 009`);
        } else {
          console.warn("[RAG] top similarity scores (no threshold):",
            (debug ?? []).map((r: any) => ({
              source: r.source_type,
              similarity: Number(r.similarity).toFixed(3),
              preview: String(r.content ?? "").slice(0, 50),
            })),
          );
        }
      }
      return [];
    }
    return data;
  } catch (err) {
    console.error("[RAG] retrieveContext failed:", err);
    return [];
  }
}

// ─── Build the system prompt with injected context ───────────
function buildSystemPrompt(
  assistant: Assistant,
  tenantName: string,
  context: Array<{ content: string; source_type: string }>,
  isFirstTurn: boolean,
): string {
  const contextBlock = context.length > 0
    ? `\n\nBUSINESS INFORMATION (your only source of truth — never invent details):\n${
        context.map((c, i) => `[${i + 1}] (${c.source_type}) ${c.content}`).join("\n")
      }`
    : "";

  const greetingRule = isFirstTurn
    ? `Open your first reply with: "${assistant.greeting_msg}". After that, do NOT greet again.`
    : `You are mid-conversation. Do NOT greet, do NOT introduce yourself, do NOT start with "Hi" — pick up from the previous turn.`;

  const leadRule = assistant.lead_capture_on
    ? "If the customer asks about specific pricing or how to buy, ask once for their name and contact (email or phone). Once they share it, thank them briefly by name and continue helping — never ask again."
    : "Answer questions directly without requiring contact information.";

  return `You are ${assistant.name}, an AI customer assistant for ${tenantName}.
Tone: ${assistant.persona_tone}. Reply in ${assistant.language}.

CONVERSATION RULES:
- ${greetingRule}
- Use the conversation history to interpret short replies like "yes", "tell me more", "the first one", "how much" — stay on the topic the customer is asking about.
- Keep replies short: 1–3 sentences, or a brief list when comparing items. Do NOT repeat information the customer already saw in the previous reply.
- ${leadRule}
- If asked about payments, give the exact payment instructions provided below.
- Never pretend to be human — you are an AI assistant.
- If the question is unrelated to ${tenantName} or the information below doesn't cover it, reply exactly: "${assistant.fallback_msg}"${contextBlock}`;
}

// ─── Score response confidence based on retrieved context ────
function scoreConfidence(
  context: Array<{ conf_score: number }>,
  userQuery: string
): number {
  if (context.length === 0) return 0.25;
  const avgConf = context.reduce((s, c) => s + (c.conf_score ?? 1), 0) / context.length;
  // Boost confidence for short, direct queries
  const lengthBoost = userQuery.split(" ").length < 8 ? 0.05 : 0;
  return Math.min(0.99, avgConf + lengthBoost);
}

// ─── Main chat function ──────────────────────────────────────
export async function chat(params: {
  tenantId:    string;
  tenantName:  string;
  assistant:   Assistant;
  messages:    Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): Promise<{ content: string; confScore: number }> {
  const { tenantId, tenantName, assistant, messages, userMessage } = params;

  // 1. Retrieve context. For short follow-ups like "yes please" / "tell me more"
  //    the message alone has no semantic anchor — combine with the previous
  //    user turn so retrieval stays on topic.
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  const retrievalQuery = lastUserMsg && userMessage.trim().split(/\s+/).length < 5
    ? `${lastUserMsg}\n${userMessage}`
    : userMessage;
  const context = await retrieveContext(tenantId, retrievalQuery);

  // 2. If confidence too low and no context found, return fallback immediately
  const confScore = scoreConfidence(context, userMessage);
  if (confScore < assistant.conf_threshold && context.length === 0) {
    return { content: assistant.fallback_msg, confScore };
  }

  // 3. Build system prompt with context injected
  const isFirstTurn = messages.length === 0;
  const systemPrompt = buildSystemPrompt(assistant, tenantName, context, isFirstTurn);

  // 4. Call OpenAI gpt-4o-mini — fast, cost-effective for customer support
  const response = await openai.chat.completions.create({
    model:       "gpt-4o-mini",
    max_tokens:  512,
    temperature: 0.4,  // Low temp for factual, consistent business responses
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content ?? assistant.fallback_msg;
  return { content, confScore };
}
