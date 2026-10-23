import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { E164 } from "@/lib/validations/common";

// Per-instance, best-effort limiter. A shared store (e.g. Redis/Upstash) is needed for strict limits on serverless.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; reset: number }>();

function limited(key: string): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  return ++h.count > MAX_PER_WINDOW;
}

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) return json({ error: "service_unavailable" }, 503);

  const auth = request.headers.get("authorization") ?? "";
  const secret = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!secret) return json({ error: "missing_api_key" }, 401, { "WWW-Authenticate": "Bearer" });
  const keyHash = createHash("sha256").update(secret).digest("hex");

  if (limited(keyHash)) return json({ error: "rate_limited" }, 429, { "Retry-After": "60" });

  const raw = await request.text();
  if (raw.length > 10_000) return json({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return json({ error: "invalid_json" }, 400);

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : null);
  const phone = str(body.phone, 20);
  if (!phone || !E164.test(phone)) return json({ error: "invalid_phone", hint: "Use E.164, e.g. +919876543210" }, 422);
  const email = str(body.email, 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_email" }, 422);

  const supabase = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("ingest_lead", {
    p_key_hash: keyHash,
    p_name: str(body.name, 120),
    p_phone: phone,
    p_email: email,
    p_source: str(body.source, 60) || "api",
    p_consent: body.consent === true,
  });
  if (error) return json({ error: "server_error" }, 500);

  const result = data as { error?: string; duplicate?: boolean; id?: string };
  if (result.error === "invalid_api_key") return json({ error: "invalid_api_key" }, 401, { "WWW-Authenticate": "Bearer" });
  if (result.error) return json({ error: result.error }, 422);
  if (result.duplicate) return json({ error: "duplicate_lead" }, 409);
  return json({ id: result.id }, 201);
}
