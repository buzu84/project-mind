# Feature Limitations

Current user-facing limitations of ProductMind. Every item verified against code as of 2026-05-23.

---

## AI Output Quality

- All AI outputs are **drafts**, not guarantees. The FAQ correctly states: "decision-support tool, not a decision-making tool."
- AI can produce incomplete, biased, or incorrect content. No automated correctness validation exists.
- Generated competitive analysis uses AI knowledge + project context — **no live market data**.
- Confidence scores on decision reviews are AI-estimated, not statistically validated.

## RAG Coverage

- **Only 4 of 10 AI features use RAG** (retrieval from uploaded feedback documents):
  - AI Chat (per project)
  - AI Roadmap
  - Multi-Agent Review
  - Decision Review (via the Evidence Layer)
- All other features (PRD, Insights, Competitive Analysis, Feature Prioritizer, Score Features, Global AI Assistant) use **project metadata from DB only** — they do not retrieve from uploaded feedback documents.
- RAG quality depends on document quality, chunk size, and embedding similarity. A quality gate discards low-similarity chunks.

## Global AI Assistant

- The Global AI Assistant (`/ai-chat`) has **no project context**.
- It uses a separate message store (`global_chat_messages`), not project-scoped `messages`.
- It should not be described as "context-aware" or "project-aware."
- It is a general product strategy chatbot only.

## Editing & Export

- AI-generated outputs (PRDs, roadmaps, analyses, reviews) are **view-only**.
- There is **no in-app editing** of individual generated fields. FAQ correctly labels this as "on the roadmap."
- There is **no export or download** feature (PDF, Markdown, CSV, etc.).
- There is **no copy-to-clipboard button**. Users must manually select and copy text.

## Generated Documents vs AI Usage

- "Generated Documents" (shown on project detail page) refers to stored AI outputs in the `decisions` table (PRDs, competitive analyses, prioritizations).
- "AI Usage" (`/usage`) is a telemetry log showing token counts, costs, and model info per AI call.
- These are separate concepts and should not be conflated in copy.

## Rate Limiting

- Rate limiter is **in-memory** (not Redis or DB-backed).
- Limits reset on serverless cold start — not persistent across deployments.
- Current limits: 20 standard operations/hour, 5 heavy operations/15 minutes.
- Admin users (in `ADMIN_EMAILS` env var) bypass rate limits entirely.

## Authentication & Security

- Row-level security (RLS) is enabled on Supabase tables.
- Auth is handled via Supabase Auth (email/password only, no OAuth providers configured).
- No SOC2, HIPAA, or compliance certifications.
- Data is sent to OpenAI for processing — no self-hosted AI option.
- No audit logging beyond AI usage telemetry.

## Collaboration

- **Single-user only.** No team features, shared projects, or multi-user access.
- No commenting, approval workflows, or notifications.

## Data & Storage

- Some AI-generated fields are stored in DB but **intentionally hidden from UI** (e.g., certain intermediate decision review artifacts).
- No data export/backup feature for users.
- No data retention policy exposed to users.

---

*Last updated: 2026-05-24*

