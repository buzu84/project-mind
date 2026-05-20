import Link from "next/link";
import { IconSparkles } from "@/components/icons";

export const metadata = {
  title: "Cookie Policy – ProductMind",
};

export default function CookiePolicyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">Cookie Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: May 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. What are cookies?</h2>
            <p className="mt-2">
              Cookies are small text files stored on your device when you visit a website. They are
              used to remember your preferences, keep you signed in, and improve your experience.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Cookies we use</h2>
            <p className="mt-2">
              ProductMind currently uses <strong>only strictly necessary cookies</strong>.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-2 pr-4 font-semibold text-gray-900">Cookie</th>
                    <th className="py-2 pr-4 font-semibold text-gray-900">Purpose</th>
                    <th className="py-2 pr-4 font-semibold text-gray-900">Duration</th>
                    <th className="py-2 font-semibold text-gray-900">Consent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2 pr-4">Authentication session (Supabase Auth)</td>
                    <td className="py-2 pr-4">Session / 1 year</td>
                    <td className="py-2">Not required (essential)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Analytics &amp; marketing cookies</h2>
            <p className="mt-2">
              We do <strong>not</strong> currently use any analytics, tracking, advertising, or
              marketing cookies. If we introduce optional cookies in the future, we will update this
              policy and request your consent before setting them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Managing cookies</h2>
            <p className="mt-2">
              You can manage or delete cookies through your browser settings. Note that disabling
              essential cookies may prevent you from signing in to ProductMind.
            </p>
            <p className="mt-2">
              If optional cookie categories are added in the future, you will be able to manage your
              preferences in <strong>Settings → Privacy &amp; Cookies</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Contact</h2>
            <p className="mt-2">
              For questions about our cookie practices, contact us at{" "}
              <span className="font-medium text-brand-600">privacy@productmind.app</span>.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 flex gap-4">
          <Link href="/privacy" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Privacy Policy
          </Link>
          <Link href="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

