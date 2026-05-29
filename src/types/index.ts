// ─── Tenant (Business) ──────────────────────────────────────
export type Plan = "starter" | "growth" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  logo_url: string | null;
  plan: Plan;
  msg_used: number;
  msg_limit: number;
  is_active: boolean;
  created_at: string;
}

// ─── User ───────────────────────────────────────────────────
export type UserRole = "owner" | "admin" | "staff";

export interface AppUser {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

// ─── Assistant ──────────────────────────────────────────────
export type Tone = "friendly" | "professional" | "formal" | "casual";
export type Language = "english" | "yoruba" | "hausa" | "igbo" | "pidgin" | "french";

export interface BehaviourRules {
  capture_lead_before_pricing: boolean;
  escalate_on_low_confidence:  boolean;
  only_business_topics:        boolean;
  show_payment_steps:          boolean;
  after_hours_response:        boolean;
}

export const DEFAULT_BEHAVIOUR_RULES: BehaviourRules = {
  capture_lead_before_pricing: true,
  escalate_on_low_confidence:  true,
  only_business_topics:        true,
  show_payment_steps:          true,
  after_hours_response:        false,
};

export interface Assistant {
  id: string;
  tenant_id: string;
  name: string;
  persona_tone: Tone;
  greeting_msg: string;
  fallback_msg: string;
  language: Language;
  lead_capture_on: boolean;
  conf_threshold: number;
  is_live: boolean;
  behaviour_rules: BehaviourRules;
  updated_at: string;
}

// ─── Knowledge Base ─────────────────────────────────────────
export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FAQ {
  id: string;
  tenant_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export type PolicyType = "returns" | "shipping" | "privacy" | "terms" | "hours" | "custom";

export interface Policy {
  id: string;
  tenant_id: string;
  policy_type: PolicyType;
  content: string;
  updated_at: string;
}

export type PaymentMethodType = "bank_transfer" | "paystack" | "opay" | "cash" | "custom";

export interface PaymentInfo {
  id: string;
  tenant_id: string;
  method_type: PaymentMethodType;
  instructions: string;
  is_active: boolean;
}

// ─── Knowledge Chunks (RAG) ─────────────────────────────────
export type KnowledgeSourceType = "product" | "faq" | "policy" | "payment" | "document";

export interface KnowledgeChunk {
  id: string;
  tenant_id: string;
  source_type: KnowledgeSourceType;
  source_id: string;
  content: string;
  conf_score: number;
  indexed_at: string;
}

// ─── Conversations ──────────────────────────────────────────
export type Channel = "website" | "whatsapp" | "instagram" | "api";
export type MessageRole = "user" | "assistant";

export interface Conversation {
  id: string;
  tenant_id: string;
  channel: Channel;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  lead_captured: boolean;
  msg_count: number;
  started_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  conf_score: number | null;
  created_at: string;
}

// ─── Leads ──────────────────────────────────────────────────
export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadStatus = "new" | "contacted" | "converted" | "lost";

export interface Lead {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  temperature: LeadTemperature;
  status: LeadStatus;
  captured_at: string;
}

// ─── Billing ────────────────────────────────────────────────
export type SubStatus = "active" | "cancelled" | "past_due" | "trialing";

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: Plan;
  paystack_sub_id: string | null;
  status: SubStatus;
  current_period_end: string | null;
}

// ─── API Response wrappers ───────────────────────────────────
export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Plan limits ────────────────────────────────────────────
export const PLAN_LIMITS: Record<Plan, { messages: number; label: string }> = {
  starter:    { messages: 500,    label: "Starter"    },
  growth:     { messages: 5000,   label: "Growth"     },
  enterprise: { messages: 999999, label: "Enterprise" },
};
