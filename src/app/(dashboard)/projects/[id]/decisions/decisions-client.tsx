"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { IconPlus, IconClock, IconScale, IconSparkles } from "@/components/icons";
import { DecisionForm } from "./decision-form";

export interface ProductDecision {
  id: string;
  title: string;
  category: string;
  status: string;
  problem_statement: string | null;
  context_summary: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

const statusBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  under_review: "info",
  accepted: "success",
  rejected: "danger",
  revisit: "warning",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  revisit: "Revisit",
};

const categoryLabels: Record<string, string> = {
  product: "Product",
  technical: "Technical",
  growth: "Growth",
  ux: "UX",
  business: "Business",
  strategy: "Strategy",
  other: "Other",
};

interface DecisionsClientProps {
  projectId: string;
  initialDecisions: ProductDecision[];
}

export function DecisionsClient({ projectId, initialDecisions }: DecisionsClientProps) {
  const [decisions, setDecisions] = useState<ProductDecision[]>(initialDecisions);
  const [showForm, setShowForm] = useState(false);
  const [editingDecision, setEditingDecision] = useState<ProductDecision | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function refreshDecisions() {
    const res = await fetch(`/api/projects/${projectId}/decisions`);
    if (res.ok) {
      const data = await res.json();
      setDecisions(data.decisions ?? []);
    }
  }

  function handleCreated() {
    setShowForm(false);
    toast("Decision created successfully");
    refreshDecisions();
  }

  function handleUpdated() {
    setEditingDecision(null);
    toast("Decision updated successfully");
    refreshDecisions();
  }

  async function handleDelete(decisionId: string) {
    const res = await fetch(`/api/projects/${projectId}/decisions/${decisionId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("Decision deleted");
      refreshDecisions();
    } else {
      toast("Failed to delete decision", "error");
    }
  }

  async function handleAnalyze(decisionId: string) {
    setAnalyzingId(decisionId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/decisions/${decisionId}/analyze`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Analysis failed.");
      }
      toast("Decision analyzed successfully");
      router.push(`/projects/${projectId}/decisions/${decisionId}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not analyze decision.", "error");
    } finally {
      setAnalyzingId(null);
    }
  }

  // Show form (create or edit)
  if (showForm || editingDecision) {
    return (
      <div>
        <DecisionForm
          projectId={projectId}
          decision={editingDecision}
          onSuccess={editingDecision ? handleUpdated : handleCreated}
          onCancel={() => { setShowForm(false); setEditingDecision(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Decisions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track product, technical, UX, growth and business decisions.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <IconPlus className="h-4 w-4" />
          New Decision
        </Button>
      </div>

      {/* List */}
      {decisions.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <IconScale className="h-7 w-7 text-gray-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-900">No decisions yet</p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            Create your first product decision to start tracking strategic choices, assumptions and recommendations.
          </p>
          <Button onClick={() => setShowForm(true)} size="sm" className="mt-5 gap-1.5">
            <IconPlus className="h-3.5 w-3.5" />
            New Decision
          </Button>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {decisions.map((d) => (
            <Card key={d.id} className="flex items-center justify-between py-4">
              <Link href={`/projects/${projectId}/decisions/${d.id}`} className="min-w-0 flex-1 hover:opacity-80 transition">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{d.title}</span>
                  <Badge variant={statusBadgeVariant[d.status] ?? "default"}>
                    {statusLabels[d.status] ?? d.status}
                  </Badge>
                  <Badge>{categoryLabels[d.category] ?? d.category}</Badge>
                  {d.confidence_score != null && (
                    <span className="text-xs text-gray-400">{d.confidence_score}%</span>
                  )}
                </div>
                {d.problem_statement && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-1">{d.problem_statement}</p>
                )}
              </Link>
              <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <IconClock className="h-3 w-3" />
                  <time suppressHydrationWarning dateTime={d.updated_at}>
                    {new Date(d.updated_at).toLocaleDateString()}
                  </time>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={analyzingId === d.id}
                  onClick={() => handleAnalyze(d.id)}
                  className="gap-1"
                >
                  <IconSparkles className="h-3.5 w-3.5" />
                  {analyzingId === d.id ? "Analyzing…" : "Analyze"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDecision(d)}
                >
                  Edit
                </Button>
                <ConfirmDialog
                  title="Delete decision?"
                  message="This will delete this decision and related decision engine records. This action cannot be undone."
                  confirmLabel="Delete"
                  variant="danger"
                  onConfirm={() => handleDelete(d.id)}
                  trigger={
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      Delete
                    </Button>
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

