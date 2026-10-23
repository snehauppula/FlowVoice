import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your organization" };

async function OnboardingGate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase
    .from("organization_members")
    .select("organization_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count) redirect("/dashboard");
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <AuthCard title="Name your organization">
      <Suspense fallback={<p role="status" className="text-muted">Loading…</p>}>
        <OnboardingGate />
      </Suspense>
    </AuthCard>
  );
}
