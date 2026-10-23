import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const IN_PROGRESS = ["initiating", "ringing", "connected", "processing"];

async function ShellWithData({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  const supabase = await createClient();

  const [configured, onCall] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true })
      .eq("organization_id", org.organizationId).in("status", ["active", "paused"]),
    supabase.from("calls").select("employee_id", { count: "exact", head: true })
      .eq("organization_id", org.organizationId).in("status", IN_PROGRESS),
  ]);

  return (
    <AppShell
      team={{ configured: configured.count ?? 0, onCall: onCall.count ?? 0 }}
      orgName={org.organizationName}
      email={org.email}
    >
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="p-8 text-muted" role="status">Loading your workspace…</div>}>
      <ShellWithData>{children}</ShellWithData>
    </Suspense>
  );
}
