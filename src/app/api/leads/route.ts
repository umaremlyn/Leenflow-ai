import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateSchema = z.object({
  id:          z.string().uuid(),
  status:      z.enum(["new","contacted","converted","lost"]).optional(),
  temperature: z.enum(["hot","warm","cold"]).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
  const { searchParams } = new URL(request.url);
  const temp   = searchParams.get("temperature");
  const status = searchParams.get("status");
  const limit  = parseInt(searchParams.get("limit") ?? "50");

  let query = supabase.from("leads").select("*, conversations(channel)", { count: "exact" })
    .eq("tenant_id", u!.tenant_id).order("captured_at", { ascending: false }).limit(limit);

  if (temp)   query = query.eq("temperature", temp);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
  try {
    const { id, ...updates } = UpdateSchema.parse(await request.json());
    const { data, error } = await supabase.from("leads")
      .update(updates).eq("id", id).eq("tenant_id", u!.tenant_id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
