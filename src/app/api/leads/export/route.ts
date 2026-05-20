import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();

  const { data: leads } = await supabase.from("leads")
    .select("full_name, email, phone, temperature, status, captured_at, conversations(channel)")
    .eq("tenant_id", u!.tenant_id).order("captured_at", { ascending: false });

  // Build CSV
  const headers = ["Name","Email","Phone","Temperature","Status","Channel","Captured At"];
  const rows = (leads ?? []).map((l: any) => [
    l.full_name, l.email ?? "", l.phone ?? "",
    l.temperature, l.status,
    l.conversations?.channel ?? "",
    new Date(l.captured_at).toLocaleString(),
  ]);

  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
