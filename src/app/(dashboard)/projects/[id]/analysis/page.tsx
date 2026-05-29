"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/toast";
import { CharacterCounter } from "@/components/ui/character-counter";
import { formatDate } from "@/lib/format-date";
import { parseDecisionInputTitle } from "@/lib/validation/json-parsers";
import type { Json } from "@/lib/supabase/types";
import {
  ANALYSIS_PRODUCT_NAME_MIN,
  ANALYSIS_PRODUCT_NAME_MAX,
  ANALYSIS_INDUSTRY_MIN,
  ANALYSIS_INDUSTRY_MAX,
  ANALYSIS_COMPETITORS_MAX,
  ANALYSIS_COMPETITORS_HELPER,
} from "@/lib/validations/analysis";

interface RecentDecision {
  id: string;
  type: string;
  input: unknown;
  created_at: string;
}

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentDecision[]>([]);

  const [productName, setProductName] = useState("");
  const [industry, setIndustry] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [productNameTouched, setProductNameTouched] = useState(false);
  const [industryTouched, setIndustryTouched] = useState(false);

  const productNameError =
    productNameTouched && productName.trim().length > 0 && productName.trim().length < ANALYSIS_PRODUCT_NAME_MIN
      ? `Product name must be at least ${ANALYSIS_PRODUCT_NAME_MIN} characters.`
      : productNameTouched && productName.trim().length === 0
        ? "Product name is required."
        : undefined;

  const industryError =
    industryTouched && industry.trim().length > 0 && industry.trim().length < ANALYSIS_INDUSTRY_MIN
      ? `Industry must be at least ${ANALYSIS_INDUSTRY_MIN} characters.`
      : industryTouched && industry.trim().length === 0
        ? "Industry is required."
        : undefined;

  const isFormValid =
    productName.trim().length >= ANALYSIS_PRODUCT_NAME_MIN &&
    industry.trim().length >= ANALYSIS_INDUSTRY_MIN;

  useEffect(() => {
    fetch(`/api/decisions?projectId=${params.id}&type=COMPETITIVE_ANALYSIS`)
      .then((r) => r.ok ? r.json() : { decisions: [] })
      .then((d) => setRecentAnalyses(d.decisions ?? []))
      .catch(() => {});
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/ai/competitive-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: params.id,
          productName: form.get("productName"),
          industry: form.get("industry"),
          competitors: form.get("competitors") || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : getFriendlyErrorMessage(data.error));

      if (data.id) {
        toast("Competitive analysis generated!");
        router.push(`/projects/${params.id}/analysis/${data.id}`);
      } else {
        setError("Analysis was generated but could not be saved. Please try again.");
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/projects/${params.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        ← Back to Project
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🔍 Competitive Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get AI-powered competitive landscape insights.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id="productName"
          name="productName"
          label="Product Name"
          placeholder="e.g. TaskFlow"
          maxLength={ANALYSIS_PRODUCT_NAME_MAX}
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onBlur={() => setProductNameTouched(true)}
          error={productNameError}
        />
        <Input
          id="industry"
          name="industry"
          label="Industry / Market"
          placeholder="e.g. Project management SaaS"
          maxLength={ANALYSIS_INDUSTRY_MAX}
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          onBlur={() => setIndustryTouched(true)}
          error={industryError}
        />
        <div>
          <Textarea
            id="competitors"
            name="competitors"
            label="Known Competitors (optional)"
            placeholder="List competitors, one per line or comma-separated (e.g. Asana, Monday.com, ClickUp)"
            maxLength={ANALYSIS_COMPETITORS_MAX}
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-gray-400">{ANALYSIS_COMPETITORS_HELPER}</p>
            <CharacterCounter current={competitors.length} max={ANALYSIS_COMPETITORS_MAX} />
          </div>
        </div>
        <Button type="submit" isLoading={loading} disabled={loading || !isFormValid}>
          Analyze Competition
        </Button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {recentAnalyses.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Recent Analyses</h3>
          <div className="space-y-2">
            {recentAnalyses.map((a) => (
              <Link key={a.id} href={`/projects/${params.id}/analysis/${a.id}`}>
                <Card className="flex items-center justify-between py-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">Analysis</Badge>
                    <span className="text-sm font-medium text-gray-700">
                      {parseDecisionInputTitle(a.input as Json | null) ?? "Untitled Analysis"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(a.created_at)}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
