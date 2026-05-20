import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ProductSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price:       z.number().positive().optional().nullable(),
  currency:    z.string().default("NGN"),
  category:    z.string().optional().nullable(),
  is_active:   z.boolean().default(true),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
  const { data, error } = await supabase.from("products").select("*")
    .eq("tenant_id", u!.tenant_id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
  try {
    const body = ProductSchema.parse(await request.json());
    const { data, error } = await supabase.from("products")
      .insert({ ...body, tenant_id: u!.tenant_id }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
