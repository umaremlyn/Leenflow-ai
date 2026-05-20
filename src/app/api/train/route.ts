import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trainTenant } from "@/lib/ai/train";
import { rateLimit, RATE_LIMITS } from "@/lib/utils/rateLimit";
import { ok, unauthorized, forbidden, rateLimited, serverError } from "@/lib/utils/apiResponse";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: appUser } = await supabase
    .from("users").select("tenant_id,role").eq("id", user.id).single();
  if (!appUser) return unauthorized();
  if (!["owner","admin"].includes(appUser.role)) return forbidden();

  // Rate limit — 5 retrains per minute per tenant
  const rl = rateLimit(`train:${appUser.tenant_id}`, RATE_LIMITS.train);
  if (!rl.allowed) return rateLimited(rl.resetInMs);

  try {
    const result = await trainTenant(appUser.tenant_id);
    return ok({ success: true, ...result });
  } catch (e) {
    return serverError(e, "train route");
  }
}
