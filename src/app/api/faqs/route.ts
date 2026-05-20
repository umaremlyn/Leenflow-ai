import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const FAQSchema = z.object({
  question:   z.string().min(5).max(500),
  answer:     z.string().min(5).max(3000),
  sort_order: z.number().int().default(0),
  is_active:  z.boolean().default(true),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
  const { data, error } = await supabase.from("faqs").select("*")
    .eq("tenant_id", u!.tenant_id).order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
  try {
    const body = FAQSchema.parse(await request.json());
    const { data, error } = await supabase.from("faqs")
      .insert({ ...body, tenant_id: u!.tenant_id }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
