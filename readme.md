# ProductMind

AI-powered product decision assistant for product managers, founders, and software teams.

## Features

- **Project Management** – Create, edit, and delete projects with structured metadata (target users, market, business model, goals)
- **Project Context Builder** – Enrich projects with personas, metrics, pain points, competitors, strategic goals, and constraints
- **PRD Generator** – Generate comprehensive product requirement documents with structured section rendering
- **Feature Prioritizer** – Score and rank features using RICE & ICE frameworks with AI-powered estimation
- **Competitive Analysis** – Get instant competitive landscape analysis, positioning insights, and strategic recommendations
- **AI Insights** – Generate strategic insights across risk, opportunity, assumption, and action categories
- **Product Roadmap** – AI-generated Now/Next/Later roadmap with 30/60/90-day plans, risks, dependencies, and success metrics
- **Multi-Agent Review** – Four AI personas (PM, CTO, UX Researcher, Growth Marketer) review your product decisions with consensus summary
- **Decision Engine** – Track product decisions with AI-powered analysis: structured options, assumptions, risks, evidence citations, and recommendations with confidence scoring
- **Evidence Layer** – Reusable retrieval layer with intent-specific configs, quality gates, citation utilities, and project-scoped evidence for all AI workflows
- **AI Chat** – Streaming chat with project-aware AI strategist (global + project-scoped with RAG context)
- **Feedback & Research** – Collect, edit, and manage customer feedback with source tagging and RAG-powered retrieval
- **RAG Pipeline** – Document chunking, OpenAI embeddings, and pgvector similarity search for context-aware AI responses
- **AI Usage Tracking** – Monitor AI operations, tokens, estimated costs, and usage history across all features
- **Authentication** – Supabase Auth with email/password sign-up, email confirmation, password reset, and account deletion
- **Rate Limiting** – Per-user AI rate limiting with admin bypass to protect OpenAI budget
- **Settings & Account** – Profile management, account security, and safe account deletion with data cleanup

## Tech Stack

- Next.js 14 (App Router)
- React 18 + TypeScript (strict)
- Tailwind CSS 3
- Supabase (Auth, Postgres, RLS, pgvector)
- OpenAI GPT-4o
- Vercel deployment

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- OpenAI API key

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.local.example .env.local

# Run SQL migrations in Supabase Dashboard → SQL Editor:
#   1. supabase/migrations/001_schema.sql
#   2. supabase/migrations/002_rls.sql
#   3-8. Additional migrations for features, context, usage, etc.

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `OPENAI_API_KEY` | OpenAI API key |
| `NEXT_PUBLIC_SITE_URL` | App URL (http://localhost:3000) |
| `USE_MOCK_AUTH` | Use mock auth for development (default: true in dev) |
| `USE_MOCK_DB` | Use in-memory DB instead of real Supabase (default: false) |
| `USE_REAL_AI` | Use real OpenAI API (default: false when no API key) |
| `ADMIN_EMAILS` | Comma-separated admin emails — bypasses AI rate limits (server-only, optional) |

### Development Modes

| Mode | Config | Description |
|---|---|---|
| Full mock | `USE_MOCK_AUTH=true USE_MOCK_DB=true USE_REAL_AI=false` | No external services needed |
| Mock auth + real AI | `USE_MOCK_AUTH=true USE_MOCK_DB=true USE_REAL_AI=true` | Uses OpenAI, in-memory DB |
| Production | Real Supabase credentials + `OPENAI_API_KEY` | Full production mode |

## Project Structure

```
src/
├── app/
│   ├── (auth)/sign-in/          # Sign-in page
│   ├── (auth)/sign-up/          # Sign-up page
│   ├── (dashboard)/             # Protected dashboard layout
│   │   ├── dashboard/           # Dashboard homepage
│   │   ├── projects/            # Projects CRUD + AI tools
│   │   │   └── [id]/
│   │   │       ├── prd/         # PRD generator + detail
│   │   │       ├── analysis/    # Competitive analysis + detail
│   │   │       ├── features/    # Feature ideas + RICE/ICE scoring
│   │   │       ├── insights/    # AI strategic insights
│   │   │       ├── roadmap/     # AI roadmap generator
│   │   │       ├── multi-agent-review/ # Multi-persona review
│   │   │       ├── chat/        # Project-scoped AI chat
│   │   │       ├── decisions/   # Decision Engine + AI analysis
│   │   │       ├── feedback/    # Feedback documents CRUD
│   │   │       └── context/     # Project context builder
│   │   ├── ai-chat/             # Global AI assistant
│   │   ├── usage/               # AI usage history
│   │   └── settings/            # User settings
│   ├── api/ai/                  # AI API routes
│   ├── auth/callback/           # Supabase OAuth callback
│   └── page.tsx                 # Marketing landing page
├── components/
│   ├── ui/                      # Reusable UI (Card, Button, Badge, Toast, ConfirmDialog)
│   ├── chat-shell.tsx           # Shared streaming chat component
│   └── document-renderer.tsx    # Markdown-to-cards renderer for PRD/Analysis
├── lib/
│   ├── ai/                      # AI utilities (pricing, tracking, mock generators, normalizers)
│   ├── decisions/               # Decision Engine service, schemas, review AI
│   ├── evidence/                # Evidence Layer (retrieval, citations, intent configs)
│   ├── rag/                     # RAG pipeline (chunking, embeddings, vector search)
│   ├── supabase/                # Supabase clients
│   ├── auth/                    # Auth helpers
│   └── openai.ts                # OpenAI client
└── middleware.ts                 # Auth session refresh + route protection
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
