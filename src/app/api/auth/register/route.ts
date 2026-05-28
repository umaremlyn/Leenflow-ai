import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RegisterRequestBody = {
  email: string;
  password: string;
  fullName: string;
  businessName: string;
  industry: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  let createdUserId: string | null = null;
  let createdTenantId: string | null = null;

  try {
    const body = (await req.json()) as RegisterRequestBody;
    const { email, password, fullName, businessName, industry } = body;

    if (!email || !password || !fullName || !businessName || !industry) {
      return NextResponse.json({ error: "Missing required registration fields." }, { status: 400 });
    }

    // Step 1 — create auth user (service role)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? "Unable to create auth user." }, { status: 500 });
    }

    createdUserId = authData.user.id;

    // Step 2 — create tenant (service role)
    const slug = slugify(businessName);
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: businessName,
        slug,
        industry,
        plan: "starter",
        msg_limit: 500,
      })
      .select("id")
      .single();

    if (tenantError || !tenantData) {
      // Rollback auth user if tenant creation failed
      if (createdUserId) {
        try { await supabase.auth.admin.deleteUser(createdUserId); } catch (e) { /* best-effort */ }
      }
      return NextResponse.json({ error: tenantError?.message ?? "Unable to create tenant." }, { status: 500 });
    }

    createdTenantId = tenantData.id;

    // Step 3 — attach tenant to app users row (upsert to handle auto-created row)
    const { error: userUpsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: createdUserId,
          tenant_id: createdTenantId,
          email,
          full_name: fullName,
          role: "owner",
        },
        { onConflict: "id" }
      );

    if (userUpsertError) {
      // Rollback tenant and auth user
      try { await supabase.from("tenants").delete().eq("id", createdTenantId); } catch (e) { /* best-effort */ }
      if (createdUserId) {
        try { await supabase.auth.admin.deleteUser(createdUserId); } catch (e) { /* best-effort */ }
      }
      return NextResponse.json({ error: userUpsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId: createdUserId, tenantId: createdTenantId });
  } catch (error) {
    // Try best-effort cleanup
    if (createdTenantId) {
      try { await supabase.from("tenants").delete().eq("id", createdTenantId); } catch (_) { /* ignore */ }
    }
    if (createdUserId) {
      try { await supabase.auth.admin.deleteUser(createdUserId); } catch (_) { /* ignore */ }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
