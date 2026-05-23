/**
 * Supabase Edge Function — Reset monthly message usage
 * Schedule: 1st of every month at 00:00 UTC
 * Set up via: Supabase Dashboard → Edge Functions → Scheduled triggers
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Verify the request is from Supabase cron
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Reset all tenants' monthly message usage counter
  const { error, count } = await supabase
    .from("tenants")
    .update({ msg_used: 0 })
    .gt("msg_used", 0); // only update tenants that actually used messages

  if (error) {
    console.error("Reset failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`Reset message usage for ${count} tenants`);
  return new Response(
    JSON.stringify({ success: true, tenantsReset: count, resetAt: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
});
