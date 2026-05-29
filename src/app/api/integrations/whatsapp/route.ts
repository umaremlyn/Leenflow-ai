import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getTenantId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const { data: u } = await supabase.from("users").select("tenant_id, role").eq("id", user.id).single();
  if (!u?.tenant_id) return { error: "No tenant" as const, status: 404 };
  if (u.role !== "owner" && u.role !== "admin") {
    return { error: "Forbidden" as const, status: 403 };
  }
  return { supabase, tenantId: u.tenant_id };
}

export async function GET() {
  const ctx = await getTenantId();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { supabase, tenantId } = ctx;

  const { data } = await supabase
    .from("tenant_integrations")
    .select("config, is_active")
    .eq("tenant_id", tenantId)
    .eq("integration", "whatsapp")
    .maybeSingle();

  if (!data || !data.is_active) {
    return NextResponse.json({ connected: false });
  }

  const cfg = (data.config ?? {}) as Record<string, string>;
  return NextResponse.json({
    connected:       true,
    phone_number_id: cfg.phone_number_id ?? "",
    verify_token:    cfg.verify_token ?? tenantId,
  });
}

export async function POST(req: Request) {
  const ctx = await getTenantId();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { supabase, tenantId } = ctx;

  const { phone_number_id, access_token } = (await req.json()) as {
    phone_number_id?: string;
    access_token?:    string;
  };

  if (!phone_number_id || !access_token) {
    return NextResponse.json({ error: "phone_number_id and access_token are required" }, { status: 400 });
  }

  const config = {
    phone_number_id: phone_number_id.trim(),
    access_token:    access_token.trim(),
    verify_token:    tenantId,
  };

  const { error } = await supabase
    .from("tenant_integrations")
    .upsert(
      { tenant_id: tenantId, integration: "whatsapp", config, is_active: true },
      { onConflict: "tenant_id,integration" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: true });
}

export async function DELETE() {
  const ctx = await getTenantId();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { supabase, tenantId } = ctx;

  const { error } = await supabase
    .from("tenant_integrations")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("integration", "whatsapp");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: false });
}
