import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trainTenant } from "@/lib/ai/train";
import { rateLimit, RATE_LIMITS } from "@/lib/utils/rateLimit";
import { unauthorized, forbidden, rateLimited, serverError } from "@/lib/utils/apiResponse";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data: appUser } = await supabase
      .from("users").select("tenant_id,role").eq("id", user.id).single();
    if (!appUser) return unauthorized();
    if (!["owner","admin"].includes(appUser.role)) return forbidden();

    const limit = rateLimit(`train:${appUser.tenant_id}`, RATE_LIMITS.train);
    if (!limit.allowed) return rateLimited(limit.resetInMs);

    const result = await trainTenant(appUser.tenant_id);
    // Flat shape — the AI Assistant page reads `chunksIndexed` and `errors` directly.
    return NextResponse.json({ ...result, trainedAt: new Date().toISOString() });
  } catch (e) {
    return serverError(e, "train-route");
  }
}
