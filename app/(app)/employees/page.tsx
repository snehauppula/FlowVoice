import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { StatusBadge } from "@/components/employees/status-badge";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_STATUSES, LANGUAGES } from "@/lib/validations/employee";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Employees" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 80);
  const status = (EMPLOYEE_STATUSES as readonly string[]).includes(first(sp.status)) ? first(sp.status) : "";

  const org = await requireOrg();
  const supabase = await createClient();
  let query = supabase
    .from("employees")
    .select("id, name, purpose, status, calling_mode, language, updated_at")
    .eq("organization_id", org.organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);
  // Archived employees are hidden unless filtered for explicitly.
  query = status ? query.eq("status", status) : query.neq("status", "archived");
  // Escape PostgREST/ilike wildcard characters so user input is matched literally.
  if (q) query = query.ilike("name", `%${q.replace(/[%_\\,()]/g, "\\$&")}%`);
  const { data, error } = await query;

  const tabs = [{ value: "", label: "All" }, ...EMPLOYEE_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))];
  const href = (s: string) => `/employees?${new URLSearchParams({ ...(q && { q }), ...(s && { status: s }) })}`;

  return (
    <>
      <PageHeader
        title="My Employees"
        description="Your AI employees and how they are configured."
        actions={<Link href="/employees/new" className="btn-primary">New employee</Link>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/employees" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            aria-label="Search employees"
            placeholder="Search by name"
            className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 sm:w-64"
          />
          <button className="btn-secondary">Search</button>
        </form>
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <Link key={t.value} href={href(t.value)} aria-current={t.value === status ? "true" : undefined}
              className={cn("chip", t.value === status && "chip-active")}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {error ? (
        <EmptyState title="Couldn't load employees" description="Something went wrong reading your employees. Refresh to try again." />
      ) : !data?.length ? (
        q || status ? (
          <EmptyState title="No matching employees" description="Try a different search or clear the status filter." action={<Link href="/employees" className="underline">Clear filters</Link>} />
        ) : (
          <EmptyState title="No employees yet" description="Create your first AI employee to start making calls." action={<Link href="/employees/new" className="btn-primary">Create an employee</Link>} />
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <li key={e.id}>
              <Link href={`/employees/${e.id}`} className="block h-full rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-accent-soft/40">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="break-words text-base">{e.name}</h2>
                  <StatusBadge status={e.status} />
                </div>
                {e.purpose && <p className="mt-1 line-clamp-2 text-muted">{e.purpose}</p>}
                <p className="mt-3 text-muted">
                  {e.calling_mode} · {LANGUAGES.find((l) => l.value === e.language)?.label ?? e.language}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
