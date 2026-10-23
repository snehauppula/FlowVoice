import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your FlowVoice account">
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
