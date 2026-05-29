/**
 * Supabase Edge Function — Email notification on new lead capture
 * Triggered by: Supabase Database Webhook on leads INSERT
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Lead {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  temperature: string;
  conversation_id: string | null;
  captured_at: string;
}

Deno.serve(async (req) => {
  const { record: lead } = await req.json() as { record: Lead };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get the business owner's email
  const { data: owner } = await supabase
    .from("users")
    .select("email, full_name, tenants(name)")
    .eq("tenant_id", lead.tenant_id)
    .eq("role", "owner")
    .single();

  if (!owner) return new Response("Owner not found", { status: 404 });

  const tenantName = (owner as any).tenants?.name ?? "your business";
  const tempEmoji  = lead.temperature === "hot" ? "🔥" : lead.temperature === "warm" ? "🌡️" : "❄️";

  // Send email via Resend
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    Deno.env.get("RESEND_FROM_EMAIL"),
      to:      owner.email,
      subject: `${tempEmoji} New lead captured — ${lead.full_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#534AB7;padding:16px 20px;border-radius:10px 10px 0 0">
            <p style="color:#fff;font-size:14px;font-weight:600;margin:0">Leen-Co AI — New Lead</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px">
            <p style="font-size:15px;font-weight:600;color:#111;margin:0 0 12px">
              ${tempEmoji} ${lead.full_name} is interested in ${tenantName}
            </p>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr><td style="color:#6b7280;padding:4px 0">Temperature</td>
                  <td style="font-weight:500;text-transform:capitalize">${lead.temperature}</td></tr>
              ${lead.email ? `<tr><td style="color:#6b7280;padding:4px 0">Email</td>
                  <td><a href="mailto:${lead.email}" style="color:#534AB7">${lead.email}</a></td></tr>` : ""}
              ${lead.phone ? `<tr><td style="color:#6b7280;padding:4px 0">Phone</td>
                  <td><a href="tel:${lead.phone}" style="color:#534AB7">${lead.phone}</a></td></tr>` : ""}
              <tr><td style="color:#6b7280;padding:4px 0">Captured</td>
                  <td>${new Date(lead.captured_at).toLocaleString()}</td></tr>
            </table>
            <a href="${Deno.env.get("NEXT_PUBLIC_APP_URL")}/leads"
               style="display:inline-block;margin-top:16px;background:#534AB7;color:#fff;font-size:13px;font-weight:500;padding:8px 18px;border-radius:8px;text-decoration:none">
              View in dashboard →
            </a>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin-top:12px;text-align:center">
            Powered by Leen-Co AI — your AI business assistant
          </p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    console.error("Email send failed:", await emailRes.text());
    return new Response("Email failed", { status: 500 });
  }

  return new Response(JSON.stringify({ sent: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
