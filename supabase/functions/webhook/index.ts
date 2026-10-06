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
    const body = await req.json();
    const id = body?.data?.id || new URL(req.url).searchParams.get("data.id");
    if (!id) {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN") || "";
    const resp = await fetch("https://api.mercadopago.com/v1/payments/" + id, {
      headers: { Authorization: "Bearer " + mpToken },
    });
    const p = await resp.json();

    if (p.status === "approved") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabase = createClient(supabaseUrl, serviceKey);

      await supabase
        .from("orders")
        .update({ pago: true, forma: p.payment_type_id })
        .eq("id", p.external_reference);
    }

    return new Response(null, { status: 200, headers: corsHeaders });
  } catch {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
});
