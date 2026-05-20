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

    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      p_tenant_id:   tenantId,
      p_embedding:   queryEmbedding,
      p_match_count: topK,
      p_threshold:   0.45,
    });

    if (error) { console.error("RAG retrieval error:", error.message); return []; }
    return data ?? [];
  } catch (err) {
    console.error("retrieveContext failed:", err);
    return [];
  }
}

// ─── Build the system prompt with injected context ───────────
function buildSystemPrompt(
  assistant: Assistant,
  tenantName: string,
  context: Array<{ content: string; source_type: string }>
): string {
  const contextBlock = context.length > 0
    ? `\n\n---\nRELEVANT BUSINESS INFORMATION (use only this to answer):\n${
        context.map((c, i) => `[${i + 1}] (${c.source_type}) ${c.content}`).join("\n")
      }\n---`
    : "";

  return `You are ${assistant.name}, the AI customer assistant for ${tenantName}.

PERSONA:
- Tone: ${assistant.persona_tone}
- Language: Respond in ${assistant.language}
- Greeting message: "${assistant.greeting_msg}"

STRICT RULES:
1. Only answer questions about ${tenantName} and its products, services, and policies.
2. If a customer asks something not covered in the business information below, say: "${assistant.fallback_msg}"
3. Never invent prices, policies, or product details not found in the context.
4. Keep responses concise — 1 to 3 sentences unless listing multiple items.
5. ${assistant.lead_capture_on
    ? "Before sharing specific pricing details, politely ask for the customer's name and contact (email or phone)."
    : "Answer questions directly without requiring contact information."}
6. If asked about payments, give the exact payment instructions provided.
7. Never pretend to be human — you are an AI assistant.
${contextBlock}`;
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

  // 1. Retrieve context from the tenant's knowledge base
  const context = await retrieveContext(tenantId, userMessage);

  // 2. If confidence too low and no context found, return fallback immediately
  const confScore = scoreConfidence(context, userMessage);
  if (confScore < assistant.conf_threshold && context.length === 0) {
    return { content: assistant.fallback_msg, confScore };
  }

  // 3. Build system prompt with context injected
  const systemPrompt = buildSystemPrompt(assistant, tenantName, context);

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
