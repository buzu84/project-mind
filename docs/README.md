# ProductMind — Engineering Documentation

## Start Here

If you're new to the codebase, read these in order:

1. [`architecture/SYSTEM_OVERVIEW.md`](architecture/SYSTEM_OVERVIEW.md) — what the system is, how it's structured, feature map
2. [`GLOSSARY.md`](GLOSSARY.md) — key terms used throughout the codebase
3. [`architecture/DATA_MODEL.md`](architecture/DATA_MODEL.md) — database tables and relationships
4. [`api/API_OVERVIEW.md`](api/API_OVERVIEW.md) — all API endpoints at a glance
5. [`operations/DEPLOYMENT.md`](operations/DEPLOYMENT.md) — how to deploy and configure

---

## Documentation Map

### Architecture (how the system works)

| Document | What it explains |
|---|---|
| [`SYSTEM_OVERVIEW.md`](architecture/SYSTEM_OVERVIEW.md) | Architecture diagram, feature map, request lifecycle, directory structure |
| [`BACKEND_ARCHITECTURE.md`](architecture/BACKEND_ARCHITECTURE.md) | Route handler patterns, service layer, structured AI output pipeline |
| [`DATA_MODEL.md`](architecture/DATA_MODEL.md) | All database tables, relationships (ER diagram), RLS |
| [`RAG_ARCHITECTURE.md`](architecture/RAG_ARCHITECTURE.md) | Document ingestion, embedding, vector search, quality gate, lexical guard |
| [`DECISION_REVIEW_FLOW.md`](architecture/DECISION_REVIEW_FLOW.md) | Multi-phase decision analysis orchestration (most complex AI workflow) |
| [`AUTH_AND_SECURITY.md`](architecture/AUTH_AND_SECURITY.md) | Session management, RLS, admin detection, security layers |
| [`ERROR_HANDLING.md`](architecture/ERROR_HANDLING.md) | Error structure, status codes, fallback behavior, logging strategy |

### API Reference (what the endpoints do)

| Document | What it covers |
|---|---|
| [`API_OVERVIEW.md`](api/API_OVERVIEW.md) | Route inventory, auth, ownership verification, response formats |
| [`AI_API_WORKFLOWS.md`](api/AI_API_WORKFLOWS.md) | Per-route input/output/flow details for all 9 AI endpoints |
| [`DECISION_ENGINE_API.md`](api/DECISION_ENGINE_API.md) | Decision CRUD, Zod schemas, AI analysis pipeline, legacy fields |
| [`AUTH_FLOW.md`](api/AUTH_FLOW.md) | Registration, login, password reset, callback handler, account deletion |
| [`RATE_LIMITING.md`](api/RATE_LIMITING.md) | Tiers, algorithm, admin bypass, 429 response, known limitations |

### Operations (how to run and deploy)

| Document | What it covers |
|---|---|
| [`DEPLOYMENT.md`](operations/DEPLOYMENT.md) | Local setup, Vercel deployment, Supabase config, migrations, troubleshooting |
| [`ENVIRONMENT_VARIABLES.md`](operations/ENVIRONMENT_VARIABLES.md) | Every env var: required/optional, used where, security notes |
| [`OBSERVABILITY.md`](operations/OBSERVABILITY.md) | Log prefixes, AI usage tracking, rate limit visibility, monitoring gaps |
| [`INCIDENT_RESPONSE.md`](operations/INCIDENT_RESPONSE.md) | Playbooks for OpenAI failure, Supabase outage, Decision Review errors |

### Quality Assurance (how to test)

| Document | What it covers |
|---|---|
| [`MANUAL_TESTING.md`](qa/MANUAL_TESTING.md) | Full-feature manual regression checklist |
| [`DECISION_REVIEW_TEST_PLAN.md`](qa/DECISION_REVIEW_TEST_PLAN.md) | Decision Review test plan with SQL verification queries |
| [`RAG_SMOKE_TEST_PLAN.md`](qa/RAG_SMOKE_TEST_PLAN.md) | RAG retrieval verification tests |
| [`DATA_LIFECYCLE_AUDIT.md`](qa/DATA_LIFECYCLE_AUDIT.md) | Deletion integrity, transactional safety, embedding lifecycle audit |

### Product (positioning and truthfulness)

| Document | What it covers |
|---|---|
| [`PRODUCT_POSITIONING.md`](product/PRODUCT_POSITIONING.md) | What ProductMind is, target user, feature set, AI boundaries, MVP limitations |
| [`FEATURE_LIMITATIONS.md`](product/FEATURE_LIMITATIONS.md) | Current user-facing limitations (RAG coverage, editing, export, collaboration) |
| [`AI_COPY_GUIDELINES.md`](product/AI_COPY_GUIDELINES.md) | Rules for honest product copy — when to use/avoid terms like RAG, export, citations |
| [`LANDING_PAGE_TRUTHFULNESS_TEST_PLAN.md`](product/LANDING_PAGE_TRUTHFULNESS_TEST_PLAN.md) | Verification that landing page claims match real product behavior |

### Roadmap (technical debt and future directions)

| Document | What it covers |
|---|---|
| [`TECHNICAL_DEBT_AND_FUTURE_IMPROVEMENTS.md`](roadmap/TECHNICAL_DEBT_AND_FUTURE_IMPROVEMENTS.md) | Known debt, dead columns, deferred work, testing roadmap |
| [`FUTURE_ARCHITECTURE_DIRECTIONS.md`](roadmap/FUTURE_ARCHITECTURE_DIRECTIONS.md) | RAG expansion, citation UX, editable workflows, multi-agent evolution, infrastructure maturity |

### Reference

| Document | What it covers |
|---|---|
| [`GLOSSARY.md`](GLOSSARY.md) | All codebase-specific definitions: RAG, pgvector, normalization, rate limiting, etc. |

---

## Reading Paths

### Understanding AI features
1. [`api/AI_API_WORKFLOWS.md`](api/AI_API_WORKFLOWS.md) — how each AI endpoint works
2. [`architecture/RAG_ARCHITECTURE.md`](architecture/RAG_ARCHITECTURE.md) — retrieval pipeline
3. [`architecture/DECISION_REVIEW_FLOW.md`](architecture/DECISION_REVIEW_FLOW.md) — most complex AI workflow
4. [`api/RATE_LIMITING.md`](api/RATE_LIMITING.md) — usage controls
5. [`product/FEATURE_LIMITATIONS.md`](product/FEATURE_LIMITATIONS.md) — what AI features can and cannot do

### Understanding auth and security
1. [`api/AUTH_FLOW.md`](api/AUTH_FLOW.md) — registration, login, session management
2. [`architecture/AUTH_AND_SECURITY.md`](architecture/AUTH_AND_SECURITY.md) — RLS, defense-in-depth, admin detection

### Understanding the Decision Engine
1. [`api/DECISION_ENGINE_API.md`](api/DECISION_ENGINE_API.md) — CRUD API, schemas
2. [`architecture/DECISION_REVIEW_FLOW.md`](architecture/DECISION_REVIEW_FLOW.md) — AI analysis orchestration
3. [`qa/DECISION_REVIEW_TEST_PLAN.md`](qa/DECISION_REVIEW_TEST_PLAN.md) — how to verify it works

### Understanding product positioning
1. [`product/PRODUCT_POSITIONING.md`](product/PRODUCT_POSITIONING.md) — what the product is and isn't
2. [`product/AI_COPY_GUIDELINES.md`](product/AI_COPY_GUIDELINES.md) — how to write honest product copy
3. [`roadmap/FUTURE_ARCHITECTURE_DIRECTIONS.md`](roadmap/FUTURE_ARCHITECTURE_DIRECTIONS.md) — where the system is heading

### For interview preparation
1. [`architecture/BACKEND_ARCHITECTURE.md`](architecture/BACKEND_ARCHITECTURE.md) — backend patterns
2. [`architecture/RAG_ARCHITECTURE.md`](architecture/RAG_ARCHITECTURE.md) — retrieval pipeline with quality gates
3. [`architecture/DECISION_REVIEW_FLOW.md`](architecture/DECISION_REVIEW_FLOW.md) — complex AI orchestration
4. [`roadmap/FUTURE_ARCHITECTURE_DIRECTIONS.md`](roadmap/FUTURE_ARCHITECTURE_DIRECTIONS.md) — engineering evolution thinking

---

## Conventions

- **Current vs future**: All docs describe the current implementation unless marked with maturity labels (✅ Implemented, 🔧 Architecture prepared, 💡 Feasible, 🔮 Exploratory). Future work lives in `roadmap/`.
- **Canonical sources**: Each concept has one authoritative doc. Other docs link to it rather than re-explaining. See the [GLOSSARY](GLOSSARY.md) for term definitions.
- **Folder boundaries**: `architecture/` = how it works. `api/` = HTTP behavior. `operations/` = deployment/runtime. `product/` = positioning/truthfulness. `qa/` = testing. `roadmap/` = future.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL + pgvector + RLS)
- **Auth**: Supabase Auth (email/password, email confirmation)
- **AI**: OpenAI GPT-4o + text-embedding-3-small
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Deployment**: Vercel (serverless)

---

*Last updated: 2026-05-23*
