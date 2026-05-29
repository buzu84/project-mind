"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CharacterCounter } from "@/components/ui/character-counter";

const MAX_FEATURE_NAME = 100;
const MAX_FEATURE_DESC = 300;
const MAX_CRITERIA = 1000;

interface FeatureInput {
  name: string;
  description: string;
}

export default function PrioritizePage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [features, setFeatures] = useState<FeatureInput[]>([
    { name: "", description: "" },
  ]);
  const [criteria, setCriteria] = useState("");

  function addFeature() {
    setFeatures((prev) => [...prev, { name: "", description: "" }]);
  }

  function updateFeature(index: number, field: keyof FeatureInput, value: string) {
    setFeatures((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    );
  }

  function removeFeature(index: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult("");

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/ai/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: params.id,
          features: features.filter((f) => f.name.trim()),
          criteria: form.get("criteria") || undefined,
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
      <h1 className="text-2xl font-bold text-gray-900">🎯 Feature Prioritizer</h1>
      <p className="mt-1 text-sm text-gray-500">
        Score and rank features using the RICE framework.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-3">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  id={`feature-name-${i}`}
                  label={i === 0 ? "Feature name" : undefined}
                  placeholder="Feature name"
                  value={feature.name}
                  onChange={(e) => updateFeature(i, "name", e.target.value)}
                  required
                  maxLength={MAX_FEATURE_NAME}
                  aria-label={`Feature ${i + 1} name`}
                />
              </div>
              <div className="flex-1">
                <Input
                  id={`feature-desc-${i}`}
                  label={i === 0 ? "Description (optional)" : undefined}
                  placeholder="Brief description (optional)"
                  value={feature.description}
                  onChange={(e) => updateFeature(i, "description", e.target.value)}
                  maxLength={MAX_FEATURE_DESC}
                  aria-label={`Feature ${i + 1} description`}
                />
              </div>
              {features.length > 1 && (
                <Button type="button" variant="ghost" onClick={() => removeFeature(i)} aria-label={`Remove feature ${i + 1}`}>
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" onClick={addFeature}>
          + Add Feature
        </Button>

        <div>
          <Textarea
            id="criteria"
            name="criteria"
            label="Additional Criteria (optional)"
            placeholder="e.g. Focus on mobile-first, revenue-generating features"
            maxLength={MAX_CRITERIA}
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
          />
          <div className="mt-1 flex justify-end">
            <CharacterCounter current={criteria.length} max={MAX_CRITERIA} />
          </div>
        </div>

        <Button type="submit" isLoading={loading}>
          Prioritize Features
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
