import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    const supabase = createAdminClient();
    await supabase.from("tenants").select("id").limit(1);
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allOk  = Object.values(checks).every(v => v === "ok");
  const status = allOk ? 200 : 503;

  return NextResponse.json({
    status:    allOk ? "healthy" : "degraded",
    checks,
    version:   process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    timestamp: new Date().toISOString(),
  }, { status });
}
