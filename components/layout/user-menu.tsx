"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email: string | undefined }) {
  const router = useRouter();

  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (error) return void toast.error("Could not sign out. Please try again.");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-2 sm:flex" title={email}>
        <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-hover" aria-hidden>
          {(email ?? "?")[0].toUpperCase()}
        </span>
        <span className="max-w-[180px] truncate text-muted">{email}</span>
      </span>
      <button onClick={signOut} className="btn-secondary h-9 px-3" aria-label="Sign out">
        <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
