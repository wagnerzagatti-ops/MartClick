import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      orderId,
      method,
      amount,
      name,
      phone,
      installments = 1,
    } = await req.json();

    const prov = Deno.env.get("PAY_PROVIDER") || "mercadopago";
    const site = Deno.env.get("SITE_URL") || "";
    const manualPixKey = Deno.env.get("MANUAL_PIX_KEY") || "";

    // PIX with manual key — no payment processor, just show the key
    if (method === "pix" && manualPixKey) {
      return new Response(
        JSON.stringify({ type: "manual", text: manualPixKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Full manual mode — no payment processor at all
    if (prov === "manual") {
      return new Response(
        JSON.stringify({ type: "manual", text: manualPixKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (prov === "mercadopago") {
      const mpToken = Deno.env.get("MP_ACCESS_TOKEN") || "";
      const H = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + mpToken,
      };

      // PIX via Mercado Pago (only if no manual key was set above)
      if (method === "pix") {
        const resp = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: { ...H, "X-Idempotency-Key": orderId },
          body: JSON.stringify({
            transaction_amount: amount,
            payment_method_id: "pix",
            external_reference: orderId,
            notification_url: site + "/functions/v1/webhook",
            payer: { email: phone + "@martclick.app", first_name: name },
          }),
        });
        const d = await resp.json();
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ error: d.message || "MP error" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = d.point_of_interaction?.transaction_data;
        return new Response(
          JSON.stringify({ type: "pix", code: t?.qr_code, qr: t?.qr_code_base64 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Credit / debit / link — use checkout preferences
      const ex: Record<string, string[]> = {
        credit: ["debit_card", "ticket", "bank_transfer"],
        debit: ["credit_card", "ticket", "bank_transfer"],
        link: [],
      };
      const excluded = (ex[method] || []).map((id) => ({ id }));

      const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          items: [{ title: "Compras MartClick", quantity: 1, unit_price: amount, currency_id: "BRL" }],
          external_reference: orderId,
          notification_url: site + "/functions/v1/webhook",
          back_urls: { success: site, failure: site, pending: site },
          auto_return: "approved",
          payment_methods: {
            excluded_payment_types: excluded,
            installments: method === "debit" ? 1 : installments,
          },
        }),
      });
      const d = await resp.json();
      if (!resp.ok) {
        return new Response(
          JSON.stringify({ error: d.message || "MP error" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ type: "link", url: d.init_point }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (prov === "stripe") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
      const params = new URLSearchParams({
        mode: "payment",
        "payment_method_types[0]": method === "pix" ? "pix" : "card",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "brl",
        "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
        "line_items[0][price_data][product_data][name]": "Compras MartClick",
        success_url: site,
        cancel_url: site,
        "metadata[orderId]": orderId,
      });
      const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: "Bearer " + stripeKey },
        body: params,
      });
      const d = await resp.json();
      if (!resp.ok) {
        return new Response(
          JSON.stringify({ error: d.error?.message || "Stripe error" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ type: "link", url: d.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "provider desconhecido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
