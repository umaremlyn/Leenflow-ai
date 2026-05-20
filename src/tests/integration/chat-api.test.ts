import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the dependencies before importing the route
vi.mock("@/lib/supabase/admin", () => {
  const makeChain = (finalValue: any) => ({
    select:  vi.fn().mockReturnThis(),
    insert:  vi.fn().mockReturnThis(),
    update:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    gte:     vi.fn().mockReturnThis(),
    limit:   vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    single:  vi.fn().mockResolvedValue(finalValue),
  });

  const activeTenant = {
    data: { id: "ten-001", name: "Test Biz", plan: "growth", msg_used: 10, msg_limit: 5000, is_active: true },
    error: null,
  };
  const activeAssistant = {
    data: { id: "ast-001", tenant_id: "ten-001", name: "Leen", persona_tone: "friendly",
            greeting_msg: "Hi!", fallback_msg: "I don't know.", language: "english",
            lead_capture_on: true, conf_threshold: 0.6, is_live: true, updated_at: new Date().toISOString() },
    error: null,
  };
  const newConv = { data: { id: "conv-001" }, error: null };

  return {
    createAdminClient: () => ({
      from: (table: string) => {
        if (table === "tenants")    return makeChain(activeTenant);
        if (table === "assistants") return makeChain(activeAssistant);
        if (table === "conversations") return { ...makeChain(newConv), insert: vi.fn().mockReturnThis() };
        return makeChain({ data: null, error: null });
      },
    }),
  };
});

vi.mock("@/lib/ai/rag", () => ({
  chat: vi.fn().mockResolvedValue({ content: "We sell ankara fabrics!", confScore: 0.88 }),
}));

describe("POST /api/assistant/chat", () => {
  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/assistant/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  }

  const validBody = {
    tenantId: "123e4567-e89b-12d3-a456-426614174000",
    message:  "What do you sell?",
    channel:  "website",
  };

  it("returns 400 for missing tenantId", async () => {
    const { POST } = await import("@/app/api/assistant/chat/route");
    const res = await POST(makeRequest({ message: "hello" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid UUID tenantId", async () => {
    const { POST } = await import("@/app/api/assistant/chat/route");
    const res = await POST(makeRequest({ ...validBody, tenantId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty message", async () => {
    const { POST } = await import("@/app/api/assistant/chat/route");
    const res = await POST(makeRequest({ ...validBody, message: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for message over 2000 chars", async () => {
    const { POST } = await import("@/app/api/assistant/chat/route");
    const res = await POST(makeRequest({ ...validBody, message: "x".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid channel", async () => {
    const { POST } = await import("@/app/api/assistant/chat/route");
    const res = await POST(makeRequest({ ...validBody, channel: "telegram" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid visitor email", async () => {
    const { POST } = await import("@/app/api/assistant/chat/route");
    const res = await POST(makeRequest({ ...validBody, visitorEmail: "not-an-email" }));
    expect(res.status).toBe(400);
  });
});
