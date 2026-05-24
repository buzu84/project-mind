# AI Copy Guidelines

Practical rules for writing honest UI and landing copy for ProductMind. Prevents overclaiming.

---

## When to say "AI-powered"

✅ OK for the overall product tagline — ProductMind does use AI for its core features.
❌ Don't use for non-AI features (Context Builder, Feedback upload, Settings, Usage page).

## When to say "RAG" or "context-aware"

✅ OK for: AI Chat (per project), AI Roadmap, Multi-Agent Review, Decision Review — these retrieve from uploaded feedback via pgvector embeddings.
✅ OK for: the "RAG-Powered Context" capability card — this describes the RAG pipeline itself.
❌ Don't say "RAG-powered" for: PRD Generator, Feature Prioritizer, Competitive Analysis, AI Insights, Score Features — these use **DB project context only**, not RAG retrieval.
⚠️ The FAQ answer about "how the AI works" should clarify that RAG applies to some features, not all.

## When to say "context-aware"

✅ OK for project-scoped AI features that receive project metadata (all project AI features).
❌ Don't use for Global AI Assistant — it has no project context.
⚠️ Distinguish "uses project metadata from DB" vs "retrieves from uploaded feedback via RAG." Both are context-aware, but at different levels.

## Don't say "citations"

ProductMind does not display inline citations, footnotes, or source references in AI output text. Decision reviews store `product_evidence` rows linked to decisions, but the UI does not render numbered citations.
❌ Avoid: "cited sources", "with citations", "evidence-cited"
✅ OK: "evidence-grounded", "with retrieved evidence", "informed by your feedback"

## How to describe generated documents

✅ "Structured AI-generated draft"
✅ "Starting point for human review"
❌ "Production-ready" — implies no review needed
❌ "Stakeholder-ready" — implies polished enough to present directly
✅ OK in FAQ to say "structured starting points designed for human review" (current FAQ does this correctly)

## How to describe Decision Review

✅ "Structured options, assumptions, risks, and a confidence-scored recommendation"
✅ "Evidence-grounded" — decision review does retrieve evidence
❌ "Automated decision-making" — it's decision support
❌ "Guaranteed recommendations" — confidence score is AI-estimated

## AI Chat vs Global AI Assistant

| | AI Chat (per project) | Global AI Assistant |
|---|---|---|
| Context | Project metadata + RAG from feedback | None |
| Message store | `messages` (project-scoped) | `global_chat_messages` (user-scoped) |
| OK to call "context-aware" | ✅ Yes | ❌ No |
| OK to call "project-specific" | ✅ Yes | ❌ No |

## Don't overclaim

| Term | Rule |
|---|---|
| "editable" | ❌ No — AI outputs are view-only |
| "export" | ❌ No — no export feature exists |
| "copy" (as feature) | ❌ No — no copy-to-clipboard button |
| "team" / "collaboration" | ❌ No — single-user only |
| "real-time" | ❌ No — no WebSocket/live features |
| "production-ready" (for outputs) | ❌ No — AI drafts require review |
| "secure" / "compliant" | ⚠️ Say "RLS-protected" or "row-level security." Don't claim compliance certifications. |
| "accurate" | ❌ Don't guarantee accuracy of AI outputs |
| "autonomous" / "agent" | ❌ No — all operations are user-initiated |
| "memory" | ⚠️ Chat has message history, but no cross-session learning or user preference memory |
| "OAuth" | ❌ No OAuth providers configured — email/password only |

For term definitions, see the canonical [GLOSSARY](../GLOSSARY.md).

---

*Last updated: 2026-05-24*

