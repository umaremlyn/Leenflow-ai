import { describe, it, expect, vi } from "vitest";
import { embedText, retrieveContext, chat } from "@/lib/ai/rag";
import type { Assistant } from "@/types";
import { DEFAULT_BEHAVIOUR_RULES } from "@/types";

const mockAssistant: Assistant = {
  id:              "ast-001",
  tenant_id:       "ten-001",
  name:            "Leen",
  persona_tone:    "friendly",
  greeting_msg:    "Hi! How can I help you?",
  fallback_msg:    "I'm not sure about that.",
  language:        "english",
  lead_capture_on: true,
  conf_threshold:  0.6,
  is_live:         true,
  behaviour_rules: DEFAULT_BEHAVIOUR_RULES,
  updated_at:      new Date().toISOString(),
};

describe("embedText", () => {
  it("returns a 1536-dimension vector", async () => {
    const result = await embedText("Test product description");
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(1536);
    result.forEach(val => expect(typeof val).toBe("number"));
  });

  it("handles very long text without throwing", async () => {
    const result = await embedText("product ".repeat(500));
    expect(result).toHaveLength(1536);
  });
});

describe("retrieveContext", () => {
  it("returns an array", async () => {
    const result = await retrieveContext("ten-001", "What is your return policy?");
    expect(Array.isArray(result)).toBe(true);
  });

  it("handles DB errors gracefully — returns empty array", async () => {
    const result = await retrieveContext("invalid-uuid", "test query");
    expect(result).toEqual([]);
  });
});

describe("chat", () => {
  it("returns content string and confScore number", async () => {
    const result = await chat({
      tenantId:    "ten-001",
      tenantName:  "Test Business",
      assistant:   mockAssistant,
      messages:    [],
      userMessage: "What products do you sell?",
    });
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
    expect(typeof result.confScore).toBe("number");
    expect(result.confScore).toBeGreaterThanOrEqual(0);
    expect(result.confScore).toBeLessThanOrEqual(1);
  });

  it("returns fallback when confidence too low and context empty", async () => {
    const result = await chat({
      tenantId:    "ten-001",
      tenantName:  "Test Business",
      assistant:   { ...mockAssistant, conf_threshold: 0.99 },
      messages:    [],
      userMessage: "Some totally unrelated question",
    });
    expect(result.content).toBe(mockAssistant.fallback_msg);
  });

  it("includes prior conversation history", async () => {
    const result = await chat({
      tenantId:    "ten-001",
      tenantName:  "Test Business",
      assistant:   mockAssistant,
      messages: [
        { role: "user",      content: "Do you sell fabric?"  },
        { role: "assistant", content: "Yes, we sell fabric!" },
      ],
      userMessage: "What types?",
    });
    expect(result.content).toBeTruthy();
  });
});
