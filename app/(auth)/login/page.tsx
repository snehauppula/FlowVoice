import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard title="Sign in to your workspace">
      <AuthForm mode="login" />
    </AuthCard>
  );
}
