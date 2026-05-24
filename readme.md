# ProductMind

A full-stack AI product management workspace built with Next.js, Supabase, pgvector, and OpenAI. Personal portfolio project demonstrating applied AI engineering patterns — structured generation, retrieval-augmented generation (RAG), multi-agent orchestration, and AI output validation.

> **This is a solo engineering project, not a startup product.** It explores how AI workflows can be integrated into a real application with proper validation, retrieval, rate limiting, and data isolation — not just raw API calls.

---

## What It Does

ProductMind provides a project workspace where a product manager can:

1. **Define a project** with structured metadata (target users, market, business model, goals)
2. **Upload feedback documents** (interviews, surveys, support tickets) that get chunked, embedded, and stored for semantic retrieval
3. **Run AI tools** that use project context and (for some features) retrieved feedback to generate structured outputs
4. **Review AI-generated artifacts** — PRDs, roadmaps, competitive analyses, decision reviews, insights
5. **Track AI usage** — token counts, costs, latency, model info across all operations

All AI outputs are project-scoped, validated with Zod schemas, and persisted to Supabase. There is no custom model training — the system uses OpenAI GPT-4o for generation and `text-embedding-3-small` for embeddings.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| Backend / API | Next.js Route Handlers (14 routes, serverless on Vercel) |
| Database | Supabase PostgreSQL with Row-Level Security |
| Vector Search | pgvector (cosine similarity, 1536-dim embeddings) |
| AI Generation | OpenAI GPT-4o |
| AI Embeddings | OpenAI text-embedding-3-small |
| Validation | Zod (request input + AI output validation) |
| Auth | Supabase Auth (email/password, email confirmation, password reset) |
| Deployment | Vercel (serverless) |

---

## Features

| Feature | What it does |
|---|---|
| **Project Workspace** | Create projects with structured metadata (name, description, target users, market, business model, goals) |
| **Context Builder** | Add structured context across 8 sections (personas, metrics, pain points, competitors, goals, constraints, open questions) |
| **Feedback & Research** | Upload documents that get chunked, embedded via pgvector, and indexed for semantic retrieval |
| **AI Chat** (per project) | Streaming conversational assistant scoped to one project — uses RAG to retrieve from uploaded feedback |
| **Global AI Assistant** | General product strategy chat — no project context, no RAG |
| **PRD Generator** | Generates a structured Product Requirements Document from project metadata |
| **Feature Prioritizer** | RICE and ICE scoring for feature ideas with AI commentary |
| **Competitive Analysis** | Market positioning, competitor comparison, gap analysis from project metadata |
| **AI Insights** | Strategic risks, opportunities, assumptions, and recommended actions |
| **AI Roadmap** | Now/Next/Later roadmap + 30/60/90-day plan — uses RAG |
| **Multi-Agent Review** | 4 AI personas (PM, CTO, UX Researcher, Growth Marketer) independently evaluate, then produce a consensus with disagreements and blind spots |
| **Decision Review** | Structured decision analysis: options, assumptions, evidence retrieval, confidence-scored recommendation |
| **Generated Documents** | Stored PRDs, competitive analyses, and prioritization results viewable per project |
| **AI Usage Tracking** | Per-call telemetry: model, tokens, cost, latency, feature, status (mock/real) |
| **Rate Limiting** | In-memory sliding window: 20 standard/hour, 5 heavy/15min, admin bypass |

---

## AI Architecture: What Uses RAG and What Doesn't

Not all features use retrieval. This table shows exactly what each AI feature does:

| Feature | Context Source | Uses RAG? | Streaming? | Validation |
|---|---|---|---|---|
| AI Chat (per project) | Project metadata + RAG from feedback | ✅ Yes | ✅ SSE | — |
| AI Roadmap | Project metadata + RAG from feedback | ✅ Yes | No | Zod |
| Multi-Agent Review | Project metadata + RAG (optional) | ✅ Yes | No | Zod (per persona) |
| Decision Review | Project metadata + Evidence Layer (RAG + citations) | ✅ Yes | No | Zod + normalization |
| PRD Generator | Project metadata from DB | ❌ No | No | Zod |
| Competitive Analysis | Project metadata from DB | ❌ No | No | Zod |
| AI Insights | Project metadata from DB | ❌ No | No | Zod + normalization |
| Feature Prioritizer | Feature list + project metadata | ❌ No | No | Zod |
| Feature Scoring | Feature descriptions | ❌ No | No | Zod |
| Global AI Assistant | None (general knowledge only) | ❌ No | ✅ SSE | — |

**4 of 10 AI features** use retrieval-augmented generation at runtime. The others generate from project metadata stored in Supabase. Intent configs exist for PRD and competitive analysis but are not yet wired into their route handlers.

---

## Technical Highlights

### RAG Pipeline with Quality Gates

Not a toy "embed and search" — the retrieval pipeline includes:

- **Chunking** (~500 chars, ~50 char overlap) → **Embedding** (text-embedding-3-small, 1536d) → **pgvector storage**
- **Threshold degradation** (0.3 → 0.2 → 0.0) — starts strict, falls back for low-data projects
- **Quality gate** (MIN_PROMPT_SIMILARITY = 0.2) — discards irrelevant chunks before prompt injection
- **Lexical guard** — keyword overlap check catches embedding false positives
- **Project-scoped** — `project_id` filter in vector search prevents cross-project leakage

Implementation: `src/lib/rag/` (chunker, embeddings, vector-search, context-builder — ~700 lines)

### Evidence Layer

Wraps RAG with intent-specific configuration per AI feature:

- 7 retrieval intents (chat, decision_review, roadmap_planning, etc.) with distinct thresholds, limits, and query prefixes
- Citation generation for AI prompts (not rendered in UI)
- `EvidenceCandidate` typed results with similarity scores

Implementation: `src/lib/evidence/` (retrieval-service, citations, intent-config, types — ~370 lines)

### Multi-Agent Review Orchestration

4 AI personas run in parallel, then a consensus is synthesized:

```
PM evaluation ─┐
CTO evaluation ─┤ (parallel) → Consensus
UX evaluation  ─┤
Growth evaluation┘
```

Each persona response is Zod-validated independently. Optional RAG context and existing insights can be included. 5 OpenAI calls per review — the most expensive feature.

Implementation: `src/app/api/ai/multi-agent-review/route.ts` (~330 lines)

### Decision Review Pipeline

The most complex AI workflow — a 10-phase orchestration:

```
Auth → Rate limit → Load decision → Load project context → Retrieve evidence (RAG)
→ Build prompt with citations → GPT-4o structured generation → Normalize AI output
→ Zod validate (retry once on failure) → Insert new records → Delete old AI records
→ Update confidence score → Track usage
```

Safety: insert-before-delete prevents data loss. `generated_by` marker prevents re-analysis from deleting manual edits.

Implementation: `src/lib/decisions/decision-review-service.ts` (~700 lines)

### Structured AI Output Validation

LLMs don't reliably produce valid JSON. Every structured AI response goes through:

```
JSON.parse() → Normalization (snake_case→camelCase, string→number, alias mapping)
→ Zod schema validation → Retry with error feedback if invalid
```

The normalization layer handles ~30 enum aliases (e.g., `"legal"` → `"business"`, `"financial"` → `"pricing"`).

### Streaming Chat (SSE)

Project chat and global chat use Server-Sent Events for real-time token delivery:

- `ReadableStream` on the server pushes `data: "token"\n\n` chunks
- Final event includes message ID and timestamp for persistence
- Partial content saved on stream interruption (best-effort)

### Security & Data Isolation

| Layer | Mechanism |
|---|---|
| Database | Row-Level Security (RLS) on every table — `auth.uid() = user_id` |
| Application | Explicit `.eq("user_id", user.id)` on every query |
| API | `getCurrentUser()` check in every route handler |
| RAG | `project_id` filter in vector search |
| Prompt | Project context scoped per request |
| Admin | `ADMIN_EMAILS` checked server-side only, never exposed to client |

### Usage Telemetry

Every AI call — real or mock — logs to the `ai_usage` table:

- Model, feature, tokens (prompt + completion), estimated cost
- Latency, status (success/error), mock flag
- Project ID, user ID, feature-specific metadata
- Fire-and-forget pattern (`void trackAIUsage(...)`) — telemetry never blocks responses

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│               Vercel (Serverless)                 │
│                                                   │
│  Next.js App Router    14 API Routes    Service   │
│  (React SSR + CSR)     (REST-like)      Layer     │
│                                         (lib/)    │
└────────────┬───────────────────┬─────────────────┘
             │                   │
   ┌─────────▼────────┐   ┌─────▼─────┐
   │    Supabase       │   │  OpenAI   │
   │  PostgreSQL + RLS │   │  GPT-4o   │
   │  pgvector         │   │  Embed    │
   │  Auth             │   │  3-small  │
   └──────────────────┘   └───────────┘
```

### Request Flow (AI Route)

1. **Auth** — Edge Middleware refreshes session; `getCurrentUser()` validates
2. **Rate limit** — In-memory sliding window check (standard or heavy tier)
3. **Input validation** — Zod schema on request body
4. **Ownership** — Project loaded with `.eq("user_id", user.id)` + RLS
5. **Context assembly** — Project metadata from DB; + RAG retrieval for 4 features
6. **AI call** — OpenAI GPT-4o with structured prompt
7. **Output validation** — Zod parse, normalize, retry once on failure
8. **Persistence** — Save to Supabase
9. **Telemetry** — `void trackAIUsage(...)` (non-blocking)
10. **Response** — JSON or SSE stream

---

## Project Structure

```
src/                           143 files, ~19K lines
├── app/
│   ├── (auth)/                # Sign-in, sign-up, password reset
│   ├── (dashboard)/           # Protected pages (projects, AI tools, settings)
│   ├── api/                   # 14 API route handlers
│   │   ├── ai/                # 9 AI generation routes
│   │   ├── decisions/         # Decision Engine CRUD
│   │   └── projects/          # Project + decision analyze routes
│   ├── auth/callback/         # Email confirmation + password reset callback
│   └── page.tsx               # Landing page
├── components/                # React UI components + design system
├── lib/
│   ├── ai/                    # Rate limiter, usage tracking, pricing, mock generators
│   ├── decisions/             # Decision Engine service, Zod schemas, normalization
│   ├── evidence/              # Evidence Layer (retrieval, citations, intent configs)
│   ├── rag/                   # RAG pipeline (chunking, embedding, vector search)
│   ├── supabase/              # Server + browser Supabase clients
│   └── auth/                  # Auth helpers, mock auth, admin detection
├── types/                     # Shared TypeScript types
└── middleware.ts              # Auth session refresh + route protection
```

---

## Setup

### Prerequisites

- Node.js 18+
- Supabase project (free tier works) — [supabase.com](https://supabase.com)
- OpenAI API key — [platform.openai.com](https://platform.openai.com)

### Install & Run

```bash
git clone <repo-url> && cd project-mind
npm install
cp .env.local.example .env.local   # Fill in credentials
npm run dev                        # http://localhost:3000
```

### Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Development flags
NEXT_PUBLIC_USE_MOCK_AUTH=true
USE_MOCK_AUTH=true
USE_MOCK_DB=false
USE_REAL_AI=false

# Optional
ADMIN_EMAILS=admin@example.com
```

### Database

Run 14 SQL migrations in order via **Supabase Dashboard → SQL Editor**. See `supabase/migrations/` for the full list.

### Development Modes

| Mode | Config | Use Case |
|---|---|---|
| Full mock | `USE_MOCK_AUTH=true`, `USE_MOCK_DB=true`, `USE_REAL_AI=false` | No external services needed |
| Mock auth + real AI | `USE_MOCK_AUTH=true`, `USE_MOCK_DB=true`, `USE_REAL_AI=true` | Test AI with mock data |
| Full production | All real credentials | End-to-end testing |

Production enforces real services — mock flags throw fatal errors at startup.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint autofix |
| `npm run format` | Prettier format |
| `npm run format:check` | Prettier check |

---

## Current Limitations

This is a portfolio/MVP project. These limitations are intentional or known:

- **No custom model training** — uses OpenAI APIs; no fine-tuning or self-hosted models
- **Single-user only** — no team collaboration, shared projects, or multi-user access
- **No export** — generated outputs are view-only in the app; no PDF/Markdown/copy-to-clipboard
- **No in-app editing** of AI-generated content — regeneration replaces previous output
- **RAG is not universal** — only 4 of 10 AI features use retrieval at runtime
- **In-memory rate limiting** — resets on serverless cold start; acceptable for MVP
- **No automated tests** — manual QA checklists and smoke test plans exist in `docs/qa/`
- **No production observability** — console logs + Vercel logs only; no Sentry/Datadog
- **AI outputs are drafts** — structured starting points for human review, not guaranteed recommendations
- **Citations are prompt-level only** — evidence is injected into AI prompts as numbered references but not rendered as interactive citations in the UI

---

## Documentation

Comprehensive engineering documentation in [`docs/`](./docs/README.md):

| Area | Docs |
|---|---|
| [Architecture](./docs/architecture/) | System overview, backend patterns, data model, RAG architecture, decision review flow, auth, error handling |
| [API Reference](./docs/api/) | Route inventory, AI workflows, decision engine API, auth flow, rate limiting |
| [Operations](./docs/operations/) | Deployment, environment variables, observability, incident response |
| [Product](./docs/product/) | Product positioning, feature limitations, AI copy guidelines, landing page truthfulness audit |
| [QA](./docs/qa/) | Manual testing checklist, decision review test plan, RAG smoke tests, data lifecycle audit |
| [Roadmap](./docs/roadmap/) | Technical debt, future architecture directions |
| [Glossary](./docs/GLOSSARY.md) | 28 codebase-specific term definitions |

---

## License

Private — not open source.

