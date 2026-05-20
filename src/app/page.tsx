import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  faqPageJsonLd,
  homeBreadcrumbJsonLd,
  faqItems,
} from "@/lib/structured-data";
import { getCurrentUser } from "@/lib/auth";
import { UserDropdown } from "@/components/ui/user-dropdown";

const features = [
  {
    title: "Evidence-Grounded Decision Reviews",
    description:
      "Analyze product decisions using retrieved project evidence and structured AI reasoning. Get options, assumptions, risks, and a confidence-scored recommendation — not just a gut feeling.",
    icon: "⚖️",
  },
  {
    title: "PRDs & Prioritized Roadmaps",
    description:
      "Generate stakeholder-ready PRDs and RICE/ICE-scored roadmaps from your project context. Outputs include user stories, success metrics, Now/Next/Later timelines, and dependency mapping.",
    icon: "🗺️",
  },
  {
    title: "Multi-Perspective Strategic Analysis",
    description:
      "Run competitive landscape analysis and multi-agent reviews — PM, CTO, UX Researcher, and Growth Marketer personas evaluate your product independently, then surface a consensus with blind spots.",
    icon: "🔬",
  },
];

const workflows = [
  {
    step: "01",
    title: "Add project context",
    description: "Define your product — target users, goals, business model, constraints, and open questions.",
  },
  {
    step: "02",
    title: "Build an evidence base",
    description: "Upload feedback, research, or interviews. Documents are indexed for context-aware AI retrieval.",
  },
  {
    step: "03",
    title: "Get structured AI outputs",
    description: "Generate PRDs, roadmaps, decision reviews, and competitive analyses — grounded in your evidence, ready for export and review.",
  },
];

const capabilities = [
  { label: "PRD Generation", detail: "Structured requirements from a product idea" },
  { label: "RICE & ICE Scoring", detail: "Framework-based feature prioritization" },
  { label: "Roadmap Builder", detail: "Now/Next/Later + 30/60/90-day plans" },
  { label: "Competitive Analysis", detail: "Market gaps, positioning, feature comparison" },
  { label: "Multi-Agent Review", detail: "PM, CTO, UX, Growth perspectives + consensus" },
  { label: "Decision Engine", detail: "Structured options, assumptions, and evidence" },
  { label: "RAG-Powered Context", detail: "Feedback docs embedded via pgvector" },
  { label: "AI Chat per Project", detail: "Context-aware assistant with retrieval" },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/sign-up";

  return (
    <div className="min-h-screen">
      {/* Structured Data */}
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={softwareApplicationJsonLd} />
      <JsonLd data={faqPageJsonLd} />
      <JsonLd data={homeBreadcrumbJsonLd} />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-xl font-bold text-brand-700">ProductMind</span>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <UserDropdown user={user} />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <p className="mb-4 text-sm font-medium text-brand-600 tracking-wide uppercase">
          AI-Powered Product Management
        </p>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          From idea to roadmap,{" "}
          <span className="text-brand-600">faster</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          ProductMind helps product managers turn ambiguous product thinking into
          structured PRDs, prioritized roadmaps, and competitive insights —
          grounded in your actual project context, not generic templates.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href={ctaHref}
            className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            {user ? "Go to Dashboard" : "Get started — it\u2019s free"}
          </Link>
          <a
            href="#features"
            className="rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-5xl px-6 py-20"
      >
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          What you can build with ProductMind
        </h2>
        <p className="mt-3 mb-12 text-center text-gray-500">
          Real PM workflows, not toy demos
        </p>
        <div className="grid gap-8 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            How it works
          </h2>
          <p className="mt-3 mb-12 text-center text-gray-500">
            Context in, structured decisions out
          </p>
          <div className="grid gap-10 sm:grid-cols-3">
            {workflows.map((w) => (
              <div key={w.step} className="text-center sm:text-left">
                <span className="text-sm font-bold text-brand-600">{w.step}</span>
                <h3 className="mt-2 text-base font-semibold text-gray-900">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Everything inside the workspace
        </h2>
        <p className="mt-3 mb-12 text-center text-gray-500">
          Each capability is project-scoped, context-aware, and regenerable
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-gray-200 bg-white px-4 py-4"
            >
              <p className="text-sm font-semibold text-gray-900">{c.label}</p>
              <p className="mt-1 text-xs text-gray-500">{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Frequently Asked Questions
        </h2>
        <p className="mt-3 text-center text-gray-500">
          Everything you need to know about ProductMind
        </p>
        <div className="mt-12 space-y-4">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-gray-200 bg-white"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="ml-4 flex-shrink-0 text-gray-400 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-6 pb-5 text-sm leading-relaxed text-gray-600">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        {/* Built with strip */}
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-center text-xs text-gray-400">
            Built with Next.js, TypeScript, Supabase, pgvector, and OpenAI ·
            RAG-grounded AI outputs · Row-level security · Rate-limited production API
          </p>
        </div>
        <div className="border-t border-gray-100 py-6 text-sm text-gray-500">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} ProductMind. All rights reserved.</span>
            <nav className="flex gap-4" aria-label="Legal">
              <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
              <Link href="/cookies" className="hover:text-gray-700">Cookies</Link>
              <Link href="/terms" className="hover:text-gray-700">Terms</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
