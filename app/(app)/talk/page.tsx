import type { Metadata } from "next";
import Link from "next/link";
import { TalkForm } from "@/components/calls/talk-form";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { E164, firstParam } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Talk to an Employee" };

export default async function TalkPage({ searchParams }: PageProps<"/talk">) {
  const sp = await searchParams;
  const to = firstParam(sp.to);
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, status")
    .eq("organization_id", org.organizationId)
    .neq("status", "archived")
    .order("name");

  return (
    <>
      <PageHeader title="Talk to an Employee" description="Place a simulated test call and review the transcript and summary." />
      {employees?.length ? (
        <TalkForm employees={employees} defaultTo={E164.test(to) ? to : ""} />
      ) : (
        <EmptyState
          title="No employees to call"
          description="Create an employee first, then come back to test it."
          action={<Link href="/employees/new" className="btn-primary">Create an employee</Link>}
        />
      )}
    </>
  );
}
