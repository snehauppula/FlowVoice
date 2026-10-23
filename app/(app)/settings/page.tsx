import type { Metadata } from "next";
import { OrganizationForm, ProfileForm, RoleSelect } from "@/components/settings/settings-forms";
import { Card, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: o }, { data: profile }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("name, timezone, calling_hours_start, calling_hours_end, default_max_retries, retention_days").eq("id", org.organizationId).single(),
    supabase.from("profiles").select("full_name").eq("id", org.userId).maybeSingle(),
    supabase.from("organization_members").select("user_id, role, created_at").eq("organization_id", org.organizationId).order("created_at"),
  ]);
  const canAdmin = ["owner", "admin"].includes(org.role);

  return (
    <>
      <PageHeader title="Settings" description="Your profile, organization and team." />
      <div className="space-y-6">
        <Card className="p-4 sm:p-6">
          <h2 className="mb-3 text-base">Profile</h2>
          <p className="mb-3 text-muted">Signed in as {org.email}</p>
          <ProfileForm fullName={profile?.full_name ?? ""} />
        </Card>
        <Card className="p-4 sm:p-6">
          <h2 className="mb-1 text-base">Organization</h2>
          {!canAdmin && <p className="mb-3 text-muted">Only owners and admins can change these settings.</p>}
          {o && <OrganizationForm disabled={!canAdmin} initial={{
            name: o.name, timezone: o.timezone, calling_hours_start: String(o.calling_hours_start).slice(0, 5),
            calling_hours_end: String(o.calling_hours_end).slice(0, 5), default_max_retries: o.default_max_retries, retention_days: o.retention_days,
          }} />}
        </Card>
        <Card className="p-4 sm:p-6">
          <h2 className="mb-1 text-base">Team</h2>
          <p className="mb-3 text-muted">Inviting teammates by email isn&apos;t available yet. Existing members and their roles are shown below.</p>
          <TableWrap>
            <thead><tr><Th>Member</Th><Th>Role</Th></tr></thead>
            <tbody>{members?.map((m) => (
              <tr key={m.user_id}>
                <Td>{m.user_id === org.userId ? `You (${org.email})` : m.user_id.slice(0, 8)}</Td>
                <Td>{m.role === "owner" || !canAdmin || m.user_id === org.userId ? <Tag tone="gold">{m.role}</Tag> : <RoleSelect userId={m.user_id} role={m.role} disabled={false} />}</Td>
              </tr>
            ))}</tbody>
          </TableWrap>
        </Card>
        <Card className="p-4 sm:p-6">
          <h2 className="mb-1 text-base">Security</h2>
          <p className="text-muted">Sessions are managed by Supabase Auth and refreshed automatically. Use “Sign out” in the header to end this session.</p>
        </Card>
      </div>
    </>
  );
}
