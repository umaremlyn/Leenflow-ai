import { vi } from "vitest";

// ── Mock Supabase ─────────────────────────────────────────────
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select:  vi.fn().mockReturnThis(),
      insert:  vi.fn().mockReturnThis(),
      update:  vi.fn().mockReturnThis(),
      delete:  vi.fn().mockReturnThis(),
      upsert:  vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      gte:     vi.fn().mockReturnThis(),
      limit:   vi.fn().mockReturnThis(),
      order:   vi.fn().mockReturnThis(),
      single:  vi.fn().mockResolvedValue({ data: null, error: null }),
      rpc:     vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}));

// ── Mock OpenAI ───────────────────────────────────────────────
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.01) }],
      }),
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "This is a test AI response." } }],
        }),
      },
    },
  })),
}));

// ── Suppress console noise in tests ──────────────────────────
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
