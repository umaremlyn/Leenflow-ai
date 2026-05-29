import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const PLAN_MESSAGE_LIMITS: Record<string, number> = {
  starter:    500,
  growth:     5000,
  enterprise: 999999,
};

export async function POST(request: NextRequest) {
  try {
    const rawBody  = await request.text();
    const hash     = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody).digest("hex");
    const signature = request.headers.get("x-paystack-signature") ?? "";

    // Verify the webhook is genuinely from Paystack
    if (hash !== signature) {
      console.warn("[Paystack] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const supabase = createAdminClient();

    switch (event.event) {
      case "subscription.create": {
        const sub      = event.data;
        const email    = sub.customer?.email;
        const plan     = sub.plan?.name?.toLowerCase() ?? "starter";
        const newSubId = sub.subscription_code;

        if (!email || !newSubId) {
          console.warn("[Paystack] subscription.create missing email or subscription_code", { email, newSubId });
          break;
        }

        const { data: user } = await supabase
          .from("users").select("tenant_id").eq("email", email).single();

        if (!user) {
          console.warn("[Paystack] subscription.create for unknown email", email);
          break;
        }

        // If an active subscription already exists for this tenant under a
        // different paystack_sub_id, refuse — prevents a third party from
        // re-binding the tenant's plan by paying with the matching email.
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("paystack_sub_id, status")
          .eq("tenant_id", user.tenant_id)
          .maybeSingle();

        if (
          existingSub &&
          existingSub.status === "active" &&
          existingSub.paystack_sub_id &&
          existingSub.paystack_sub_id !== newSubId
        ) {
          console.warn(
            "[Paystack] Refusing subscription.create — tenant already has active sub",
            { tenant_id: user.tenant_id, existing: existingSub.paystack_sub_id, incoming: newSubId },
          );
          break;
        }

        const limit = PLAN_MESSAGE_LIMITS[plan] ?? 500;
        await supabase.from("tenants").update({ plan, msg_limit: limit }).eq("id", user.tenant_id);
        await supabase.from("subscriptions").upsert({
          tenant_id:          user.tenant_id,
          plan,
          paystack_sub_id:    newSubId,
          status:             "active",
          current_period_end: sub.next_payment_date,
        }, { onConflict: "tenant_id" });
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const subCode = event.data?.subscription_code;
        if (subCode) {
          await supabase.from("subscriptions")
            .update({ status: "cancelled" }).eq("paystack_sub_id", subCode);
          // Downgrade to starter
          const { data: sub } = await supabase
            .from("subscriptions").select("tenant_id").eq("paystack_sub_id", subCode).single();
          if (sub) {
            await supabase.from("tenants")
              .update({ plan: "starter", msg_limit: 500 }).eq("id", sub.tenant_id);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const subCode = event.data?.subscription?.subscription_code;
        if (subCode) {
          await supabase.from("subscriptions")
            .update({ status: "past_due" }).eq("paystack_sub_id", subCode);
        }
        break;
      }

      default:
        console.log(`[Paystack] Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Paystack Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
