import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OrgContext = {
  userId: string;
  email: string | undefined;
  organizationId: string;
  organizationName: string;
  role: "owner" | "admin" | "member" | "viewer";
};

/**
 * Resolves the signed-in user and their organization from the database.
 * The organization is derived from membership, never from a browser-supplied id.
 */
export async function requireOrg(): Promise<OrgContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const org = membership?.organizations as unknown as { id: string; name: string } | null;
  if (!membership || !org) redirect("/onboarding");

  return {
    userId: user.id,
    email: user.email,
    organizationId: org.id,
    organizationName: org.name,
    role: membership.role,
  };
}
