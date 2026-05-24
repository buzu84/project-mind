# Product Positioning

What ProductMind actually is, who it's for, and what it is not.

---

## What ProductMind Is

ProductMind is a single-user, AI-assisted product strategy workspace. It helps product managers and founders turn ambiguous product thinking into structured outputs — PRDs, feature prioritization, competitive analysis, roadmaps, decision reviews, and multi-perspective reviews — scoped to individual projects.

It is deployed as a Next.js web application backed by Supabase (PostgreSQL + Auth) and OpenAI (GPT-4o for generation, text-embedding-3-small for embeddings).

---

## Target User

- Solo product managers or PMs on small teams
- Startup founders doing their own product thinking
- Product leads who need structured artifacts without a dedicated analyst
- Portfolio/demo context: shows full-stack AI product skills

---

## Core Value Proposition

> Turn project context + uploaded feedback into structured, evidence-aware AI outputs — not generic template fills.

The differentiator is **project-scoped context**: every AI feature receives the project's metadata, and some features (chat, roadmap, multi-agent review) additionally retrieve relevant chunks from uploaded feedback documents via RAG.

---

## What ProductMind Is NOT

- **Not a project management tool** — no tasks, sprints, boards, or team assignments
- **Not a collaboration tool** — single-user only, no shared projects or team features
- **Not a document editor** — AI outputs are view-only; no in-app editing of generated fields
- **Not a data analytics platform** — no dashboards, charts, or real metrics ingestion
- **Not production-grade enterprise software** — MVP with in-memory rate limiting, no SLA, no audit logs
- **Not an autonomous agent** — all AI operations are user-initiated, one-shot generations

---

## Current Feature Set

| Feature | AI? | Uses RAG? | Output |
|---|---|---|---|
| Context Builder | No | No | Saves structured project context (8 fields) to DB |
| Feedback & Research | No | Triggers embedding | Upload/manage feedback documents; chunks + embeds them |
| AI Chat (per project) | Yes | **Yes** | Streaming conversational assistant scoped to one project |
| Global AI Assistant | Yes | **No** | General product strategy chat, no project context |
| PRD Generator | Yes | No — DB context only | Structured PRD (JSON stored in `decisions` table) |
| Feature Prioritizer | Yes | No | RICE/ICE scores per feature |
| Competitive Analysis | Yes | No — DB context only | Market/competitor comparison |
| AI Insights | Yes | No | Strategic risks, opportunities, recommendations |
| AI Roadmap | Yes | **Yes** | Now/Next/Later + 30/60/90-day plan |
| Multi-Agent Review | Yes | **Yes** (optional) | 4-persona review + consensus |
| Decision Review | Yes | **Yes** (Evidence Layer) | Options, assumptions, evidence, confidence score |
| AI Usage | No | No | View-only usage telemetry log |
| Settings | No | No | Profile, password, admin status display |

---

## AI Capability Boundaries

- **Model**: GPT-4o (generation), text-embedding-3-small (embeddings)
- **RAG**: Chat, roadmap, multi-agent review, and decision review retrieve from uploaded feedback. All other features use project metadata from DB only.
- **Quality gate**: RAG retrieval applies similarity threshold + lexical guard to avoid injecting irrelevant context
- **No memory across sessions**: Each API call builds context from DB/RAG fresh; no persistent conversation memory beyond stored message history
- **No cross-project context**: Each project is isolated; the AI cannot reference data from other projects
- **No internet access**: AI has no web browsing; competitive analysis uses AI knowledge + project context, not live data

---

## MVP Limitations

- In-memory rate limiting (resets on serverless cold start)
- No export/download of generated outputs
- No copy-to-clipboard buttons
- No in-app editing of AI-generated fields
- No team/collaboration features
- No billing/payment infrastructure
- No automated testing of AI output quality
- Single AI provider (OpenAI only)

---

## Honest Positioning

ProductMind is a **portfolio/demo-quality MVP** that demonstrates:
- Full-stack Next.js + Supabase + OpenAI integration
- RAG pipeline with pgvector
- Structured AI output generation
- Row-level security and auth
- Rate limiting and usage tracking

It is suitable for personal use and demonstration. It is not positioned as enterprise software.

---

*Last updated: 2026-05-24*

