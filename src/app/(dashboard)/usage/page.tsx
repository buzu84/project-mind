import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEATURE_LABELS } from "@/lib/ai/usage-types";
import type { AIUsageFeature } from "@/lib/ai/usage-types";
import { formatDate, formatTime } from "@/lib/format-date";
import { formatNumber } from "@/lib/format-number";

// Supabase SDK doesn't infer nested-select / join types.
// This named alias replaces an inline anonymous cast.
interface UsageRowWithProject {
  id: string;
  feature: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  status: string;
  is_mock: boolean;
  created_at: string;
  project_id: string | null;
  projects: { name: string } | null;
}

// Ensure this page always shows fresh data (no static caching)
export const dynamic = "force-dynamic";

export default async function UsageHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = createClient();

  const { data: rows } = await supabase
    .from("ai_usage")
    .select(
      "id, feature, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, status, is_mock, created_at, project_id, projects(name)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);


  const usageRows = (rows ?? []) as unknown as UsageRowWithProject[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Usage History</h2>
        <p className="mt-1 text-sm text-gray-500">
          Detailed log of all AI operations and their costs.
        </p>
        <details className="mt-2 text-xs text-gray-400">
          <summary className="cursor-pointer underline decoration-dotted hover:text-gray-600 transition">What are tokens?</summary>
          <p className="mt-1 text-xs text-gray-500">
            Tokens are units of text processed by AI models. Roughly 1 token ≈ 4 characters or ¾ of a word. Cost is based on the number of tokens used.
          </p>
        </details>
      </div>

      <Card className="overflow-hidden p-0">
        {usageRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-500">No AI usage recorded yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Usage will appear here after you use any AI feature.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3 text-right">Prompt</th>
                  <th className="px-4 py-3 text-right">Completion</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDate(row.created_at)}{" "}
                      <span className="text-gray-400">
                        {formatTime(row.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.projects?.name ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">
                        {FEATURE_LABELS[row.feature as AIUsageFeature] ??
                          row.feature}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {row.model}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {formatNumber(row.prompt_tokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {formatNumber(row.completion_tokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                      {formatNumber(row.total_tokens)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      ${row.estimated_cost.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          row.status === "success"
                            ? "success"
                            : row.status === "error"
                              ? "danger"
                              : "default"
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={row.is_mock ? "warning" : "success"}>
                        {row.is_mock ? "Mock" : "Real"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

