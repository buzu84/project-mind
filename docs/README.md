# ProductMind — Engineering Documentation

## Documentation Map

| Folder | Purpose |
|---|---|
| [`architecture/`](architecture/) | System design, data model, service boundaries, request flows |
| [`api/`](api/) | API endpoint reference, auth, rate limiting, error handling |
| [`qa/`](qa/) | Test plans, smoke tests, manual testing checklists |
| [`product/`](product/) | Copy guidelines, truthfulness audits, feature limitations |
| [`operations/`](operations/) | Deployment, environment variables, observability |
| [`roadmap/`](roadmap/) | Technical debt, future improvements, architecture evolution |

## Recommended Reading Order

### For new developers
1. [`architecture/SYSTEM_OVERVIEW.md`](architecture/SYSTEM_OVERVIEW.md) — what the system is, how it's structured
2. [`architecture/DATA_MODEL.md`](architecture/DATA_MODEL.md) — database tables and relationships
3. [`architecture/BACKEND_ARCHITECTURE.md`](architecture/BACKEND_ARCHITECTURE.md) — service layers, API patterns, middleware
4. [`api/API_OVERVIEW.md`](api/API_OVERVIEW.md) — all endpoints at a glance
5. [`operations/DEPLOYMENT.md`](operations/DEPLOYMENT.md) — how to deploy

### For understanding AI features
1. [`architecture/RAG_ARCHITECTURE.md`](architecture/RAG_ARCHITECTURE.md) — evidence retrieval pipeline
2. [`architecture/DECISION_REVIEW_FLOW.md`](architecture/DECISION_REVIEW_FLOW.md) — most complex AI workflow
3. [`api/RATE_LIMITING.md`](api/RATE_LIMITING.md) — AI usage controls

### For interview preparation
1. [`architecture/BACKEND_ARCHITECTURE.md`](architecture/BACKEND_ARCHITECTURE.md) — demonstrates real backend patterns
2. [`architecture/DECISION_REVIEW_FLOW.md`](architecture/DECISION_REVIEW_FLOW.md) — 10-phase orchestration pipeline
3. [`architecture/BACKEND_GLOSSARY.md`](architecture/BACKEND_GLOSSARY.md) — key terms explained

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL + pgvector + RLS)
- **Auth**: Supabase Auth (email/password, email confirmation)
- **AI**: OpenAI GPT-4o + text-embedding-3-small
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Deployment**: Vercel (serverless)

