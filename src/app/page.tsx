import Link from "next/link";

const features = [
  {
    title: "PRD Generator",
    description:
      "Generate comprehensive product requirement documents from a simple idea description.",
    icon: "📄",
  },
  {
    title: "Feature Prioritizer",
    description:
      "Score and rank features by impact, effort, and strategic alignment using AI.",
    icon: "🎯",
  },
  {
    title: "Competitive Analysis",
    description:
      "Get instant competitive landscape analysis and positioning insights.",
    icon: "🔍",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-xl font-bold text-brand-700">ProductMind</span>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          Make better product decisions{" "}
          <span className="text-brand-600">with AI</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          ProductMind helps product managers, founders, and software teams
          generate PRDs, prioritize features, and analyze competition — all
          powered by AI.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/sign-in"
            className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            Start Free
          </Link>
          <a
            href="#features"
            className="rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-5xl px-6 py-20 grid gap-8 sm:grid-cols-3"
      >
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{f.description}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} ProductMind. All rights reserved.
      </footer>
    </div>
  );
}

