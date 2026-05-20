import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "./rag";

// ─── Split text into overlapping chunks ─────────────────────
// Overlap ensures context isn't lost at chunk boundaries
function chunkText(text: string, maxChars = 400, overlap = 60): string[] {
  if (text.length <= maxChars) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    let slice = text.slice(start, end);

    // Try to break at a sentence boundary
    const lastPeriod = slice.lastIndexOf(". ");
    if (lastPeriod > maxChars * 0.6) slice = slice.slice(0, lastPeriod + 1);

    if (slice.trim()) chunks.push(slice.trim());
    start += slice.length - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

// ─── Insert a single knowledge chunk ────────────────────────
async function insertChunk(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  sourceType: string,
  sourceId: string,
  content: string,
  confScore = 1.0
) {
  const embedding = await embedText(content);
  await supabase.from("knowledge_chunks").insert({
    tenant_id:   tenantId,
    source_type: sourceType,
    source_id:   sourceId,
    content,
    embedding,
    conf_score:  confScore,
  });
}

// ─── Full retrain for a tenant ───────────────────────────────
export async function trainTenant(tenantId: string): Promise<{
  chunksIndexed: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let chunksIndexed = 0;

  // Delete existing chunks for clean retrain
  await supabase.from("knowledge_chunks").delete().eq("tenant_id", tenantId);

  // ── 1. Products ───────────────────────────────────────────
  const { data: products } = await supabase
    .from("products").select("*").eq("tenant_id", tenantId).eq("is_active", true);

  for (const p of products ?? []) {
    const text = [
      `Product name: ${p.name}`,
      p.description  ? `Description: ${p.description}`         : null,
      p.price        ? `Price: ${p.currency} ${p.price}`        : null,
      p.category     ? `Category: ${p.category}`                : null,
    ].filter(Boolean).join(". ");

    for (const chunk of chunkText(text)) {
      try { await insertChunk(supabase, tenantId, "product", p.id, chunk); chunksIndexed++; }
      catch (e) { errors.push(`Product "${p.name}": ${String(e)}`); }
    }
  }

  // ── 2. FAQs ──────────────────────────────────────────────
  const { data: faqs } = await supabase
    .from("faqs").select("*").eq("tenant_id", tenantId).eq("is_active", true);

  for (const f of faqs ?? []) {
    // Index question and answer together — great for semantic search
    const text = `Question: ${f.question}\nAnswer: ${f.answer}`;
    try { await insertChunk(supabase, tenantId, "faq", f.id, text); chunksIndexed++; }
    catch (e) { errors.push(`FAQ "${f.question.slice(0, 40)}": ${String(e)}`); }
  }

  // ── 3. Policies ──────────────────────────────────────────
  const { data: policies } = await supabase
    .from("policies").select("*").eq("tenant_id", tenantId);

  for (const p of policies ?? []) {
    const header = `${p.policy_type.replace(/_/g, " ")} policy: `;
    for (const chunk of chunkText(header + p.content)) {
      try { await insertChunk(supabase, tenantId, "policy", p.id, chunk); chunksIndexed++; }
      catch (e) { errors.push(`Policy "${p.policy_type}": ${String(e)}`); }
    }
  }

  // ── 4. Payment info ───────────────────────────────────────
  const { data: payments } = await supabase
    .from("payment_info").select("*").eq("tenant_id", tenantId).eq("is_active", true);

  for (const p of payments ?? []) {
    const text = `Payment method: ${p.method_type.replace(/_/g, " ")}. ${p.instructions}`;
    try { await insertChunk(supabase, tenantId, "payment", p.id, text); chunksIndexed++; }
    catch (e) { errors.push(`Payment "${p.method_type}": ${String(e)}`); }
  }

  console.log(`[trainTenant] tenant=${tenantId} chunks=${chunksIndexed} errors=${errors.length}`);
  return { chunksIndexed, errors };
}
