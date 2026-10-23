"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";

export type TeamStatus = { configured: number; onCall: number };

export function Sidebar({
  team,
  orgName,
  onNavigate,
  idPrefix = "side",
}: {
  team: TeamStatus;
  orgName: string;
  onNavigate?: () => void;
  idPrefix?: string;
}) {
  const pathname = usePathname();
  // The longest matching href wins so /employees/new doesn't also highlight /employees.
  const all = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
  const active = all
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="px-5 pb-3 pt-5">
        <Link href="/dashboard" onClick={onNavigate} aria-label="FlowVoice dashboard"><Brand /></Link>
        <p className="mt-2 truncate text-muted" title={orgName}>{orgName}</p>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1.5 text-muted">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const isActive = active === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                        isActive ? "font-semibold text-primary-hover" : "hover:bg-primary-pale",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={`${idPrefix}-active`}
                          className="absolute inset-0 rounded-lg bg-primary-soft"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className={cn("relative", isActive ? "text-primary-strong" : "text-muted")} />
                      <span className="relative">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="m-3 rounded-xl border border-border bg-primary-pale p-3">
        <p className="font-semibold">Your team</p>
        <p className="mt-0.5 flex items-center gap-2 text-muted">
          <span className={cn("size-2 rounded-full", team.onCall ? "bg-primary" : "bg-border-strong")} aria-hidden />
          {team.configured} configured · {team.onCall} on a call
        </p>
      </div>
    </nav>
  );
}
