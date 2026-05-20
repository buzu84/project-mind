import Link from "next/link";
import { IconSparkles } from "@/components/icons";

export const metadata = {
  title: "Privacy Policy – ProductMind",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <IconSparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">ProductMind</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: May 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. What we collect</h2>
            <p className="mt-2">
              When you create an account, we store your email address, display name, and an optional
              avatar URL. When you use the product, we store your projects, feedback documents,
              AI-generated artifacts (PRDs, roadmaps, insights, decision analyses, etc.), and AI usage
              metrics (feature used, token counts, timestamps — not prompt content).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. How we use your data</h2>
            <p className="mt-2">
              Your data is used solely to provide the ProductMind service. When you use AI features,
              relevant project context, feedback excerpts, or prompts may be sent to OpenAI for
              processing. We do not use your data to train AI models. We do not sell, rent, or share
              your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. AI processing</h2>
            <p className="mt-2">
              ProductMind uses OpenAI&apos;s API to power AI features such as chat, PRD generation,
              decision review, and competitive analysis. When you trigger an AI feature, the app sends
              relevant context (project details, feedback snippets, your prompt) to OpenAI. OpenAI
              processes this data under their{" "}
              <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:text-brand-700 underline">
                API data usage policy
              </a>
              , which states that API inputs and outputs are not used to train their models.
            </p>
            <p className="mt-2">
              <strong>User responsibility:</strong> Do not upload highly sensitive, confidential, or
              regulated data (e.g. medical records, financial credentials, classified information)
              unless you are comfortable with it being processed by third-party AI services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Cookies</h2>
            <p className="mt-2">
              ProductMind uses only <strong>strictly necessary cookies</strong> for authentication
              and session management (powered by Supabase Auth). We do not use analytics cookies,
              tracking pixels, or marketing cookies. See our{" "}
              <Link href="/cookies" className="font-medium text-brand-600 hover:text-brand-700 underline">Cookie Policy</Link>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Third-party services</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><strong>Supabase</strong> — authentication, database, and infrastructure</li>
              <li><strong>OpenAI</strong> — AI-powered analysis and generation</li>
              <li><strong>Vercel</strong> — hosting and deployment</li>
            </ul>
            <p className="mt-2">
              Each provider processes data under their own privacy policies. We encourage you to
              review their terms if you have concerns about data handling.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Data retention</h2>
            <p className="mt-2">
              Your data is retained as long as your account is active. You can delete your account
              and all associated data at any time from Settings → Danger Zone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Your rights</h2>
            <p className="mt-2">
              You have the right to access, correct, and delete your personal data. You can export
              or delete your data through the app. For additional requests, contact us at the email
              below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Beta disclaimer</h2>
            <p className="mt-2">
              ProductMind is currently in beta. Privacy practices may evolve as the product develops.
              Material changes to this policy will be communicated via the app or email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Contact</h2>
            <p className="mt-2">
              For privacy-related questions, contact us at{" "}
              <span className="font-medium text-brand-600">privacy@productmind.app</span>.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6">
          <Link href="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
