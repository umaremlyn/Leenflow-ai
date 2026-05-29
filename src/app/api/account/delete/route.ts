import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: appUser, error: lookupErr } = await admin
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (lookupErr || !appUser) {
    return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  if (appUser.role === "owner" && appUser.tenant_id) {
    const { error: tenantErr } = await admin.from("tenants").delete().eq("id", appUser.tenant_id);
    if (tenantErr) {
      return NextResponse.json({ error: tenantErr.message }, { status: 500 });
    }
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
