import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

type VerifyPaymentPayload = {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export const APIRoute = createAPIFileRoute("/api/verify-payment")({
  POST: async ({ request }) => {
    try {
      const {
        order_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }: VerifyPaymentPayload = await request.json();

      if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 1. Fetch order details from Supabase using Admin client (bypasses RLS)
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select("id, total_amount, status")
        .eq("id", order_id)
        .single();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (order.status === "paid") {
        return new Response(JSON.stringify({ success: true, message: "Already paid" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 2. Cryptographic signature verification
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const isTestMode = !secret || secret === "your-razorpay-secret-here";

      if (!isTestMode) {
        // Production cryptographic signature verification
        const text = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto.createHmac("sha256", secret).update(text).digest("hex");

        if (generated_signature !== razorpay_signature) {
          return new Response(JSON.stringify({ error: "Invalid payment signature" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 3. Amount verification via Razorpay API
        const keyId = process.env.VITE_RAZORPAY_KEY_ID;
        const authHeader = "Basic " + Buffer.from(keyId + ":" + secret).toString("base64");
        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
          headers: { Authorization: authHeader },
        });

        if (rzpRes.ok) {
          const paymentData = await rzpRes.json();
          const paidAmount = paymentData.amount / 100; // Razorpay returns in paisa
          // Tolerate minor rounding differences up to 0.05
          if (Math.abs(paidAmount - order.total_amount) > 0.05) {
            return new Response(
              JSON.stringify({
                error: `Payment amount mismatch. Expected ${order.total_amount}, got ${paidAmount}`,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        } else {
          return new Response(JSON.stringify({ error: "Failed to verify amount with Razorpay" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        console.warn("[Razorpay] Secret key missing/test. Bypassing live verification checks.");
      }

      // 4. Set session config config-setting to let public trigger allow the transition
      const { error: sessionErr } = await supabaseAdmin.rpc("verify_payment", {
        p_order_id: order_id,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_razorpay_signature: razorpay_signature,
      });

      if (sessionErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update order status: " + sessionErr.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      console.error("[verify-payment] Error:", e);
      return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
