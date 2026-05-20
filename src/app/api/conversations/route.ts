import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
  const { searchParams } = new URL(request.url);
  const limit   = parseInt(searchParams.get("limit") ?? "50");
  const channel = searchParams.get("channel");
  const since   = searchParams.get("since");

  let query = supabase.from("conversations").select("*", { count: "exact" })
    .eq("tenant_id", u!.tenant_id).order("started_at", { ascending: false }).limit(limit);

  if (channel) query = query.eq("channel", channel);
  if (since)   query = query.gte("started_at", since);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}
