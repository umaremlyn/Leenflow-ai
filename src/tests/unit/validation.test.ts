import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the chat API schema for validation tests
const ChatSchema = z.object({
  tenantId:       z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message:        z.string().min(1).max(2000),
  channel:        z.enum(["website","whatsapp","instagram","api"]).default("website"),
  visitorName:    z.string().optional(),
  visitorEmail:   z.string().email().optional(),
  visitorPhone:   z.string().optional(),
});

describe("Chat API schema validation", () => {
  const validPayload = {
    tenantId: "123e4567-e89b-12d3-a456-426614174000",
    message:  "Hello, what do you sell?",
    channel:  "website" as const,
  };

  it("accepts a valid payload", () => {
    const result = ChatSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID tenantId", () => {
    const result = ChatSchema.safeParse({ ...validPayload, tenantId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty message", () => {
    const result = ChatSchema.safeParse({ ...validPayload, message: "" });
    expect(result.success).toBe(false);
  });

  it("rejects message over 2000 chars", () => {
    const result = ChatSchema.safeParse({ ...validPayload, message: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid channel", () => {
    const result = ChatSchema.safeParse({ ...validPayload, channel: "telegram" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = ChatSchema.safeParse({ ...validPayload, visitorEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("defaults channel to website", () => {
    const { channel, ...noChannel } = validPayload;
    const result = ChatSchema.safeParse(noChannel);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.channel).toBe("website");
  });

  it("accepts optional fields when present", () => {
    const result = ChatSchema.safeParse({
      ...validPayload,
      visitorName:  "Chidi Kalu",
      visitorEmail: "chidi@email.com",
      visitorPhone: "+2348031112233",
    });
    expect(result.success).toBe(true);
  });
});

// Product schema validation
const ProductSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price:       z.number().positive().optional().nullable(),
  currency:    z.string().default("NGN"),
  category:    z.string().optional().nullable(),
  is_active:   z.boolean().default(true),
});

describe("Product schema validation", () => {
  it("accepts valid product", () => {
    const r = ProductSchema.safeParse({ name: "Premium Ankara", price: 5000, currency: "NGN" });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = ProductSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects negative price", () => {
    const r = ProductSchema.safeParse({ name: "Test", price: -100 });
    expect(r.success).toBe(false);
  });

  it("allows null price", () => {
    const r = ProductSchema.safeParse({ name: "Test", price: null });
    expect(r.success).toBe(true);
  });
});
