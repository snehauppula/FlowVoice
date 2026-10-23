import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ListChecks, PhoneCall, UserPlus } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "AI employees that call, qualify and follow up",
  description: "FlowVoice lets you create AI employees, load their knowledge, run call campaigns and review every conversation in one place.",
  alternates: { canonical: "/" },
  openGraph: { title: "FlowVoice", description: "AI employees that call, qualify and follow up with your leads.", type: "website" },
};

const STEPS = [
  [UserPlus, "Create an employee", "Name it, set its goal, voice, greeting and the questions it should ask."],
  [BookOpen, "Teach it your business", "Add FAQs and notes so answers match how you actually work."],
  [PhoneCall, "Run calls", "Test with simulated calls, upload a contact list, or send leads in through the API."],
  [ListChecks, "Review results", "Read transcripts and summaries, and see which leads qualified."],
] as const;

const FAQ = [
  ["Does FlowVoice place real phone calls today?", "Not yet. Calls currently run in a clearly labelled simulation. Real calling needs a telephony provider to be connected, and every simulated call is marked as such."],
  ["Can I call anyone?", "No. You confirm that contacts have agreed to be called and are not on a do-not-disturb registry. Numbers marked do-not-call are skipped."],
  ["Where is my data stored?", "In your Supabase project, with row-level security so each organization only sees its own records."],
  ["What does it cost?", "Billing is simulated during development. No payments are taken."],
];

export default function Home() {
  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Brand />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2 font-semibold hover:bg-primary-soft">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <p className="mb-3 inline-block rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary-hover">AI voice-calling workspace</p>
          {/* Landing hero is the one place the type scale steps above 24px. */}
          <h1 className="text-[clamp(28px,5vw,44px)] leading-[1.15] tracking-tight">
            AI employees that call, qualify and <span className="text-primary">follow up</span> with your leads
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">Set up an employee in minutes, test it safely, and see every conversation, outcome and cost in one workspace.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Create your workspace <ArrowRight size={18} /></Link>
            <a href="#how" className="btn-secondary px-6 py-3 text-base">How it works</a>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-4 py-10 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h2 className="mb-1 text-base">The problem</h2>
            <p className="text-muted">Leads go cold while your team is busy. Follow-up calls are slow, inconsistent and hard to measure.</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary-pale p-6 shadow-card">
            <h2 className="mb-1 text-base">The fix</h2>
            <p className="text-muted">An AI employee follows your script every time, captures the details you care about, and logs the result so you can act on it.</p>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-10">
          <h2 className="mb-5 text-[24px]">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([Icon, t, d], i) => (
              <li key={t} className="rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-pop">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-strong" aria-hidden><Icon size={18} /></span>
                <p className="mt-3 text-muted">Step {i + 1}</p>
                <h3 className="text-base">{t}</h3>
                <p className="mt-1 text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="mb-4 text-[24px]">Questions</h2>
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-border bg-surface p-4 shadow-card open:border-primary/30">
                <summary className="cursor-pointer font-semibold">{q}</summary>
                <p className="mt-2 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 text-center">
          <div className="rounded-xl bg-primary-strong px-6 py-12 text-primary-foreground shadow-pop">
            <h2 className="text-[24px]">Try it with a simulated call</h2>
            <p className="mt-2 opacity-90">No phone number or card needed.</p>
            <Link href="/signup" className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-foreground px-6 py-3 text-base font-semibold text-primary-hover transition-transform hover:scale-[1.02]">Get started</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
