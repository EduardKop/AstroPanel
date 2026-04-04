import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UPSTREAM_URL = "https://api.novalumen.org/v1/users/statistics";
const DEFAULT_OFFSET = 2;

const buildUpstreamUrl = (fromDt: string, toDt: string, offset: number) => {
  const url = new URL(UPSTREAM_URL);
  url.searchParams.set("from_dt", fromDt);
  url.searchParams.set("to_dt", toDt);
  url.searchParams.set("offset", String(offset));
  return url.toString();
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const secret = Deno.env.get("NOVALUMEN_API_SECRET");
    if (!secret) {
      throw new Error("NOVALUMEN_API_SECRET is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const fromDt = String(body?.fromDt || "");
    const toDt = String(body?.toDt || "");
    const offset = Number(body?.offset ?? DEFAULT_OFFSET);

    if (!fromDt || !toDt) {
      return new Response(JSON.stringify({ error: "fromDt and toDt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(buildUpstreamUrl(fromDt, toDt, offset), {
      headers: {
        "X-API-Secret": secret,
      },
    });

    if (!response.ok) {
      throw new Error(`Upstream HTTP error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("novalumen-statistics proxy error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
