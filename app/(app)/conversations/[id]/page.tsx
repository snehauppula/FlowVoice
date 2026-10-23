import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Transcript } from "@/components/calls/transcript";
import { Card, PageHeader, SimulatedBadge } from "@/components/ui/page";
import { Tag, callTone, fmtDate, fmtDuration } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TranscriptTurn } from "@/lib/providers/voice/types";

export const metadata: Metadata = { title: "Conversation" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConversationPage({ params }: PageProps<"/conversations/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: call } = await supabase
    .from("calls")
    .select("*, employees(id, name), leads(id, name), conversations(transcript, summary, outcome, captured_data)")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();
  if (!call) notFound();

  const emp = call.employees as unknown as { id: string; name: string } | null;
  const lead = call.leads as unknown as { id: string; name: string | null } | null;
  const raw = call.conversations as unknown;
  const convo = (Array.isArray(raw) ? raw[0] : raw) as
    | { transcript: TranscriptTurn[]; summary: string | null; outcome: string | null; captured_data: Record<string, string> }
    | null
    | undefined;

  const facts: [string, React.ReactNode][] = [
    ["Employee", emp ? <Link key="e" className="underline" href={`/employees/${emp.id}`}>{emp.name}</Link> : "—"],
    ["Lead", lead ? <Link key="l" className="underline" href={`/leads/${lead.id}`}>{lead.name ?? "Unnamed lead"}</Link> : "—"],
    ["Direction", <span key="d" className="capitalize">{call.direction}</span>],
    ["Number", call.direction === "inbound" ? call.from_number : call.to_number],
    ["Started", call.started_at ? fmtDate(call.started_at) : fmtDate(call.created_at)],
    ["Duration", fmtDuration(call.duration_seconds)],
    ["Credits", String(Number(call.cost_credits))],
    ["Outcome", convo?.outcome?.replace("_", " ") ?? "—"],
  ];

  return (
    <>
      <PageHeader
        title="Conversation"
        description={call.id}
        actions={<div className="flex items-center gap-2"><Tag tone={callTone(call.status)}>{call.status.replace("_", " ")}</Tag>{call.is_simulated && <SimulatedBadge />}</div>}
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <dl className="space-y-2">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words text-right">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <div className="space-y-4">
          {call.error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-danger">{call.error}</p>}
          {convo?.summary && (
            <Card><h2 className="mb-1 text-base">Summary</h2><p>{convo.summary}</p></Card>
          )}
          {convo && Object.keys(convo.captured_data ?? {}).length > 0 && (
            <Card>
              <h2 className="mb-2 text-base">Captured fields</h2>
              <dl className="space-y-1">{Object.entries(convo.captured_data).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>
              ))}</dl>
            </Card>
          )}
          <Card>
            <h2 className="mb-2 text-base">Transcript</h2>
            <Transcript turns={convo?.transcript ?? []} />
          </Card>
          <Card>
            <h2 className="mb-1 text-base">Recording</h2>
            <p className="text-muted">{call.recording_path ? "A private recording exists for this call." : "No recording. Simulated calls and calls without a provider are not recorded."}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
