import { Card } from "@/components/ui/page";
import { Brand } from "@/components/layout/brand";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const configured = getSupabaseEnv() !== null;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fade-in w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand /></div>
        <Card className="p-6 shadow-pop">
          <h1 className="mb-4 text-base">{title}</h1>
          {configured ? (
            children
          ) : (
            <p role="alert" className="text-danger">
              Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code>,
              fill in your project URL and anon key, then restart the dev server.
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
