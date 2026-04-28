"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult("");

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
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data.content);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">🔍 Competitive Analysis</h1>
      <p className="mt-1 text-sm text-gray-500">
        Get AI-powered competitive landscape insights.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          id="productName"
          name="productName"
          label="Product Name"
          placeholder="e.g. TaskFlow"
          required
        />
        <Input
          id="industry"
          name="industry"
          label="Industry / Market"
          placeholder="e.g. Project management SaaS"
          required
        />
        <Textarea
          id="competitors"
          name="competitors"
          label="Known Competitors (optional)"
          placeholder="e.g. Asana, Monday.com, ClickUp"
        />
        <Button type="submit" isLoading={loading}>
          Analyze Competition
        </Button>
      </form>

      {result && (
        <Card className="mt-8">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {result}
          </div>
        </Card>
      )}
    </div>
  );
}

