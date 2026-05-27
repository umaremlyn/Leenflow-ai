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
  try {
    const body = (await req.json()) as RegisterRequestBody;
    const { email, password, fullName, businessName, industry } = body;

    if (!email || !password || !fullName || !businessName || !industry) {
      return NextResponse.json({ error: "Missing required registration fields." }, { status: 400 });
    }

    const supabase = createAdminClient();

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
      return NextResponse.json({ error: tenantError?.message ?? "Unable to create tenant." }, { status: 500 });
    }

    const { error: userUpsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: authData.user.id,
          tenant_id: tenantData.id,
          email,
          full_name: fullName,
          role: "owner",
        },
        { onConflict: ["id"] }
      );

    if (userUpsertError) {
      return NextResponse.json({ error: userUpsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
