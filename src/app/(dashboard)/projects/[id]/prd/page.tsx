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

const MIN_DESCRIPTION_LENGTH = 10;

interface RecentDecision {
  id: string;
  type: string;
  input: { productName?: string } | null;
  created_at: string;
}

export default function PrdPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentPrds, setRecentPrds] = useState<RecentDecision[]>([]);

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const descriptionTooShort = productDescription.length > 0 && productDescription.length < MIN_DESCRIPTION_LENGTH;
  const descriptionError =
    descriptionTouched && descriptionTooShort
      ? `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`
      : undefined;

  const isFormValid = productName.trim().length > 0 && productDescription.length >= MIN_DESCRIPTION_LENGTH;

  useEffect(() => {
    fetch(`/api/decisions?projectId=${params.id}&type=PRD`)
      .then((r) => r.ok ? r.json() : { decisions: [] })
      .then((d) => setRecentPrds(d.decisions ?? []))
      .catch(() => {});
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

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
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : getFriendlyErrorMessage(data.error));

      if (data.id) {
        toast("PRD generated successfully!");
        router.push(`/projects/${params.id}/prd/${data.id}`);
      } else {
        setError("PRD was generated but could not be saved. Please try again.");
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
        <h2 className="text-2xl font-bold text-gray-900">📄 PRD Generator</h2>
        <p className="mt-1 text-sm text-gray-500">
          Generate a product requirements document from a description.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="productName"
          name="productName"
          label="Product Name"
          placeholder="e.g. TaskFlow"
          required
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />

        <div>
          <Textarea
            id="productDescription"
            name="productDescription"
            label="Product Description"
            placeholder="Describe what the product does, the problem it solves..."
            required
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            onBlur={() => setDescriptionTouched(true)}
            error={descriptionError}
          />
          <p className={`mt-1 text-xs ${descriptionTooShort && descriptionTouched ? "text-red-500" : "text-gray-400"}`}>
            {productDescription.length} / {MIN_DESCRIPTION_LENGTH} characters
          </p>
        </div>

        <Input
          id="targetAudience"
          name="targetAudience"
          label="Target Audience (optional)"
          placeholder="e.g. SMB project managers"
        />

        <Button type="submit" isLoading={loading} disabled={loading || !isFormValid}>
          Generate PRD
        </Button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {recentPrds.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Recent PRDs</h3>
          <div className="space-y-2">
            {recentPrds.map((prd) => (
              <Link key={prd.id} href={`/projects/${params.id}/prd/${prd.id}`}>
                <Card className="flex items-center justify-between py-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">PRD</Badge>
                    <span className="text-sm font-medium text-gray-700">
                      {prd.input?.productName ?? "Untitled PRD"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(prd.created_at).toLocaleDateString()}
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

