import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Amounts are in kobo and must match the plan price configured in Paystack.
// If you change pricing, update both Paystack and these values.
const PLAN_PRICING: Record<string, { code: string | undefined; amount_kobo: number }> = {
  growth:     { code: process.env.PAYSTACK_PLAN_GROWTH,     amount_kobo: 1_500_000 }, // ₦15,000
  enterprise: { code: process.env.PAYSTACK_PLAN_ENTERPRISE, amount_kobo: 4_500_000 }, // ₦45,000
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = (await req.json()) as { plan?: string };
  if (plan !== "growth" && plan !== "enterprise") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const pricing = PLAN_PRICING[plan];
  if (!pricing.code) {
    return NextResponse.json(
      { error: `Paystack plan code not configured for ${plan}. Set PAYSTACK_PLAN_${plan.toUpperCase()} in env.` },
      { status: 500 },
    );
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 500 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email:        user.email,
      amount:       pricing.amount_kobo,
      plan:         pricing.code,
      callback_url: `${origin}/settings?billing=success`,
      metadata:     { user_id: user.id, target_plan: plan },
    }),
  });

  const payload = await res.json();
  if (!res.ok || !payload.status) {
    console.error("[Paystack] initialize failed", { status: res.status, payload });
    return NextResponse.json(
      { error: payload.message ?? "Paystack initialize failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ authorization_url: payload.data.authorization_url });
}
