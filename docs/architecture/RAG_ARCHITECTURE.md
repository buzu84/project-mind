# RAG Architecture

RAG (Retrieval-Augmented Generation) is how ProductMind grounds AI outputs in the user's actual project data instead of relying on generic LLM knowledge.

## Pipeline Overview

```mermaid
graph TD
    subgraph Ingestion ["Document Ingestion (write path)"]
        A["User uploads feedback document"] --> B["chunker.ts: Split into ~500 char chunks"]
        B --> C["embeddings.ts: OpenAI text-embedding-3-small"]
        C --> D["ingest.ts: Store chunks + vectors in document_chunks"]
    end

    subgraph Retrieval ["Evidence Retrieval (read path)"]
        E["AI feature needs context"] --> F["Build query from decision/project"]
        F --> G["embeddings.ts: Embed query"]
        G --> H["vector-search.ts: pgvector cosine similarity"]
        H --> I["Quality gate: MIN_SIMILARITY = 0.2"]
        I --> J["Lexical guard: keyword overlap check"]
        J --> K["context-builder.ts: Format for prompt injection"]
    end
```

## Ingestion Path

When a user adds a feedback document:

1. **Chunking** (`lib/rag/chunker.ts`): Document text is split into chunks of ~500 characters with ~50 character overlap. This ensures each chunk is small enough to embed meaningfully but large enough to contain useful context.

2. **Embedding** (`lib/rag/embeddings.ts`): Each chunk is converted to a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model. This vector captures the semantic meaning of the text.

3. **Storage** (`lib/rag/ingest.ts`): Chunks are stored in the `document_chunks` table with their embedding vector, source document ID, project ID, and original text content.

## Retrieval Path

When an AI feature needs project context:

1. **Query construction**: The feature builds a search query from relevant context (e.g., decision title + problem statement for Decision Review).

2. **Query embedding**: The search query is embedded using the same model.

3. **Vector search** (`lib/rag/vector-search.ts`): Supabase RPC `match_document_chunks` performs cosine similarity search against stored chunks, filtered by project ID.

4. **Quality gate**: Results below `MIN_PROMPT_SIMILARITY` (0.2) are discarded. If no results meet the threshold, retrieval degrades gracefully with progressively lower thresholds.

5. **Lexical guard** (`lib/rag/context-builder.ts`): A secondary check that verifies retrieved chunks share actual keywords with the query. This catches cases where semantic similarity is high but the content is topically unrelated (a known limitation of embedding-based search).

6. **Context formatting**: Surviving chunks are formatted into a text block that gets injected into the AI prompt as "Available Evidence".

## Evidence Layer Abstraction

The Evidence Layer (`lib/evidence/`) wraps the RAG pipeline with a higher-level interface:

```typescript
const result = await retrieveEvidence({
  userId,
  projectId,
  intent: "decision_review",  // intent-specific config
  query: "Should we build feature X?",
});
```

Each intent (e.g., `decision_review`, `chat`, `roadmap_planning`) has its own retrieval configuration (number of results, similarity threshold, etc.) defined in `lib/evidence/intent-config.ts`.

## Cross-Project Isolation

Project isolation is enforced at multiple levels:
- **RLS**: `document_chunks` has row-level security policies limiting access by `user_id`
- **Query filter**: Vector search always includes `project_id` in the SQL filter
- **Dev verification**: In development mode, retrieved chunks are verified to belong to the requested project (with console error if violated)

## Key Design Decisions

### Why pgvector (not Pinecone/Weaviate)?
Supabase includes pgvector, keeping everything in one database. No additional service to manage, no data sync issues, and RLS policies apply uniformly.

### Why text-embedding-3-small (not ada-002)?
Better performance at lower cost. 1536 dimensions. Sufficient quality for the retrieval task.

### Why the lexical guard?
Embedding similarity can produce false positives — chunks that are semantically "close" in vector space but topically irrelevant. The lexical guard is a simple keyword overlap check that catches these cases. It's a pragmatic quality improvement, not a replacement for better embeddings.

### Why quality gate with degradation?
The quality gate prevents injecting irrelevant context into AI prompts. Degradation (lowering threshold if no results found) ensures retrieval doesn't fail silently on projects with limited data.

## Feature-by-Feature RAG Usage Matrix

Not every AI feature uses RAG. This matrix classifies each feature's actual context source based on the implementation.

| Feature | Route / Service | Context Source | RAG Retrieval? | Embeddings? | Logs `query_embedding`? | Logs `rag_search`? |
|---|---|---|---|---|---|---|
| **AI Chat** (per project) | `api/ai/chat` | Project metadata + `project_context` + conversation history + RAG chunks | ✅ Full RAG (`retrieveRelevantContext`) | ✅ Query embedding | ✅ Yes | Via retrieval log |
| **AI Roadmap** | `api/ai/roadmap` | Project metadata + `project_context` + recent insights + RAG chunks | ✅ Full RAG (`retrieveRelevantContext`) | ✅ Query embedding | ✅ Yes | Via retrieval log |
| **Multi-Agent Review** | `api/ai/multi-agent-review` | Project metadata + `project_context` + optional RAG + optional insights | ✅ Full RAG (optional, via `retrieveRelevantContext`) | ✅ Query embedding (when enabled) | ✅ When enabled | Via retrieval log |
| **Decision Review** | `lib/decisions/decision-review-service.ts` | Decision data + options + assumptions + Evidence Layer RAG | ✅ Full RAG (`retrieveEvidence` → vector search + citations) | ✅ Query embedding | ✅ Yes | ✅ Via `logRetrievalEvent` |
| **AI Insights** | `api/ai/insights` | Project metadata + `project_context` + recent feedback document summaries (direct DB) | ❌ No RAG | ❌ No | ❌ No | ❌ No |
| **PRD Generator** | `api/ai/prd` | User-provided fields (product name, description, audience) | ❌ No RAG | ❌ No | ❌ No | ❌ No |
| **Competitive Analysis** | `api/ai/competitive-analysis` | Project metadata (direct DB) | ❌ No RAG | ❌ No | ❌ No | ❌ No |
| **Feature Prioritizer** | `api/ai/prioritize` | User-provided feature list + project metadata | ❌ No RAG | ❌ No | ❌ No | ❌ No |
| **Score Features** | `api/ai/score-features` | Feature ideas from DB + `project_context` | ❌ No RAG | ❌ No | ❌ No | ❌ No |
| **Global AI Assistant** | `api/ai/global-chat` | None (general product knowledge) | ❌ No RAG | ❌ No | ❌ No | ❌ No |
| **Feedback Ingestion** | `lib/rag/ingest.ts` (via feedback actions) | N/A (write path) | N/A | ✅ Document embedding | ✅ `document_embedding` | N/A |
| **Context Builder** | `(dashboard)/projects/[id]/context` | N/A (manual user input, stored in `project_context`) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Dashboard / Recent AI Activity** | `(dashboard)/dashboard` | Direct DB queries on `ai_usage`, `insights`, `decisions` | ❌ No AI | ❌ No | ❌ No | ❌ No |

**Summary:** 4 of 10 AI features use RAG at runtime. 6 features use direct DB context or user-provided input. Feedback ingestion uses embeddings on the write path only.

### Terminology Guide

- **Full RAG**: Query is embedded → pgvector cosine similarity search → relevant chunks injected into prompt
- **Direct DB context**: Project metadata / feedback summaries loaded via standard Supabase queries (no vector search)
- **Project context**: Structured fields from `project_context` table injected into prompt without vector retrieval
- **AI-generated**: Plain OpenAI completion from user-provided or DB-loaded context
- **Embedding ingestion**: Document chunked and embedded on upload (write path only, not retrieval)

## Key Files

| File | Lines | Role |
|---|---|---|
| `lib/rag/chunker.ts` | 110 | Document text splitting |
| `lib/rag/embeddings.ts` | 124 | OpenAI embedding calls |
| `lib/rag/vector-search.ts` | 190 | pgvector search + diagnostics |
| `lib/rag/context-builder.ts` | 273 | Quality gate, lexical guard, formatting |
| `lib/rag/ingest.ts` | ~50 | Chunk storage |
| `lib/evidence/retrieval-service.ts` | 183 | High-level retrieval abstraction |
| `lib/evidence/citations.ts` | ~60 | Citation ID generation |
| `lib/evidence/intent-config.ts` | ~60 | Per-intent retrieval configuration |

