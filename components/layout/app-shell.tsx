"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Sidebar, type TeamStatus } from "./sidebar";
import { UserMenu } from "./user-menu";
import { Brand } from "./brand";
import { ALL_NAV_ITEMS } from "@/lib/nav";

export function AppShell({
  children,
  team,
  orgName,
  email,
}: {
  children: React.ReactNode;
  team: TeamStatus;
  orgName: string;
  email: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on Escape and lock background scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const current = ALL_NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-border bg-sidebar lg:block">
          <Sidebar team={team} orgName={orgName} idPrefix="desktop" />
        </aside>

        <AnimatePresence>
          {open && (
            <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button aria-label="Close menu" className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
              <motion.aside
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
                className="relative h-full w-72 max-w-[85vw] bg-sidebar shadow-pop"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              >
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-full p-2 hover:bg-primary-soft">
                  <X size={18} />
                </button>
                <Sidebar team={team} orgName={orgName} idPrefix="mobile" onNavigate={() => setOpen(false)} />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <button aria-label="Open menu" className="rounded-full p-2 hover:bg-primary-soft lg:hidden" onClick={() => setOpen(true)}>
                <Menu size={20} />
              </button>
              <span className="lg:hidden"><Brand /></span>
              <span className="hidden truncate text-muted lg:inline">{orgName}{current ? <> <span aria-hidden>/</span> <span className="font-semibold text-foreground">{current.label}</span></> : null}</span>
            </div>
            <UserMenu email={email} />
          </header>
          <main className="fade-in mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </MotionConfig>
  );
}
