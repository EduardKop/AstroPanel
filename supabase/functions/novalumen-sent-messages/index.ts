import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UPSTREAM_URL = "https://api.novalumen.org/v1/users/statistics/sent-messages";
const DEFAULT_OFFSET = 2;
const PARALLEL_BATCH_SIZE = 8;

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizeUserIds = (input: unknown) => {
  if (!Array.isArray(input)) return [];

  return [...new Set(
    input
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0),
  )];
};

const buildUpstreamUrl = (fromDt: string, toDt: string, offset: number, userId: number) => {
  const url = new URL(UPSTREAM_URL);
  url.searchParams.set("from_dt", fromDt);
  url.searchParams.set("to_dt", toDt);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("user_id", String(userId));
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
    const userIds = normalizeUserIds(body?.userIds);

    if (!fromDt || !toDt) {
      return new Response(JSON.stringify({ error: "fromDt and toDt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ results: {}, errors: {}, meta: { fromDt, toDt, offset, count: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    const userIdChunks = chunkArray(userIds, PARALLEL_BATCH_SIZE);
    for (const userIdChunk of userIdChunks) {
      await Promise.all(userIdChunk.map(async (userId) => {
        try {
          const response = await fetch(buildUpstreamUrl(fromDt, toDt, offset, userId), {
            headers: {
              "X-API-Secret": secret,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          results[String(userId)] = await response.json();
        } catch (error) {
          console.error(`novalumen-sent-messages: user ${userId}`, error);
          errors[String(userId)] = error instanceof Error ? error.message : "Unknown upstream error";
        }
      }));
    }

    return new Response(JSON.stringify({
      results,
      errors,
      meta: {
        fromDt,
        toDt,
        offset,
        count: userIds.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("novalumen-sent-messages fatal error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
