"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export default function PrdPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult("");

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/ai/prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: params.id,
          productName: form.get("productName"),
          productDescription: form.get("productDescription"),
          targetAudience: form.get("targetAudience") || undefined,
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
      <h1 className="text-2xl font-bold text-gray-900">📄 PRD Generator</h1>
      <p className="mt-1 text-sm text-gray-500">
        Generate a product requirements document from a description.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          id="productName"
          name="productName"
          label="Product Name"
          placeholder="e.g. TaskFlow"
          required
        />
        <Textarea
          id="productDescription"
          name="productDescription"
          label="Product Description"
          placeholder="Describe what the product does, the problem it solves..."
          required
        />
        <Input
          id="targetAudience"
          name="targetAudience"
          label="Target Audience (optional)"
          placeholder="e.g. SMB project managers"
        />
        <Button type="submit" isLoading={loading}>
          Generate PRD
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

