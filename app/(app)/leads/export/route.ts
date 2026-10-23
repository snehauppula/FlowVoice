import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES } from "@/lib/validations/lead";
import { likeTerm } from "@/lib/validations/common";

/** Spreadsheet apps execute cells starting with these characters as formulas. */
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: membership } = await supabase
    .from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return new NextResponse("Forbidden", { status: 403 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const status = request.nextUrl.searchParams.get("status") ?? "";
  let query = supabase
    .from("leads")
    .select("name, phone, email, source, status, consent_given, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(5000);
  if ((LEAD_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${likeTerm(q)}%,phone.ilike.%${likeTerm(q)}%,email.ilike.%${likeTerm(q)}%`);
  const { data, error } = await query;
  if (error) return new NextResponse("Export failed", { status: 500 });

  const cols = ["name", "phone", "email", "source", "status", "consent_given", "created_at"] as const;
  const csv = [cols.join(","), ...(data ?? []).map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads.csv"',
      "Cache-Control": "no-store",
    },
  });
}
