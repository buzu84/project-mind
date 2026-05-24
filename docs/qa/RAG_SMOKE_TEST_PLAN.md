# RAG & Evidence — Smoke Test Plan

Manual tests for verifying RAG retrieval, project isolation, and quality gating. Tests use the **AI Chat** feature as the primary observable surface for RAG behavior.

---

## Prerequisites

```env
# .env.local
USE_MOCK_AUTH=true
NEXT_PUBLIC_USE_MOCK_AUTH=true
USE_REAL_AI=true
OPENAI_API_KEY=<valid key>
```

All migrations applied (especially `004_chunk_index.sql` for `match_document_chunks` RPC).

```bash
npm run dev
```

---

## How RAG Works (Quick Reference)

1. User adds a feedback document via **Feedback & Research** tab.
2. Document text is split into ~500 char chunks with ~50 char overlap (`lib/rag/chunker.ts`).
3. Each chunk is embedded via OpenAI `text-embedding-3-small` (1536 dimensions) and stored in `document_chunks` table.
4. When an AI feature runs, the query is embedded and compared against stored chunks via `match_document_chunks` RPC (cosine similarity, filtered by `project_id`).
5. Chunks passing the quality gate (`MIN_PROMPT_SIMILARITY = 0.2` for the base RAG layer) are injected into the AI prompt as context.
6. The Evidence Layer (`lib/evidence/`) wraps RAG with per-intent thresholds (e.g., `chat: 0.72`, `decision_review: 0.25`).

**Key:** RAG is retrieval + context injection. It does not give the AI "memory" — it finds relevant chunks and adds them to the prompt.

---

## Test 1 — Relevant Feedback Retrieved in Chat

### Setup

1. Create project **"Zephyr Rewards"**.
2. Go to **Feedback & Research** tab → **Add Feedback**:
   - **Title:** `Beta Tester Batch 7 Summary`
   - **Content:**
     ```
     Users in beta batch 7 reported that the quasar-loyalty-points redemption flow
     has three major pain points: (1) unclear point balance visibility on mobile,
     (2) redemption confirmation takes over 8 seconds, and (3) no email receipt
     after redemption. 14 out of 20 testers rated the flow as "frustrating".
     ```
   - **Source:** `Customer Interview`
3. Wait ~3 seconds for embedding ingestion.

### Execute

4. Go to **AI Chat** tab inside "Zephyr Rewards".
5. Ask: `What are the main pain points with the loyalty points redemption flow?`

### Verify

- [ ] AI response mentions at least one: "quasar-loyalty-points", "point balance", "8 seconds", "email receipt", or "frustrating".
- [ ] Response does not fabricate data sources that were never added.

### Verify — Dev Logs

| Log | Expected |
|---|---|
| `[rag] Vector search OK:` | `rpcResults` ≥ 1 |
| `[rag] Quality filter:` | `hasRelevantContext: true`, `usedChunks` ≥ 1 |

### Verify — Database (optional)

```sql
-- Confirm chunks were created
SELECT COUNT(*) FROM document_chunks WHERE project_id = '<ZEPHYR_PROJECT_ID>';
-- Expected: ≥ 1

-- Check embedding dimensions
SELECT array_length(embedding, 1) FROM document_chunks
WHERE project_id = '<ZEPHYR_PROJECT_ID>' LIMIT 1;
-- Expected: 1536
```

### Verify — AI Usage

```sql
SELECT feature, prompt_tokens, completion_tokens, status
FROM ai_usage WHERE project_id = '<ZEPHYR_PROJECT_ID>'
ORDER BY created_at DESC LIMIT 5;
```

Expected rows from this operation:
- `feature = 'query_embedding'` — has token usage (embedding the chat query)
- `feature = 'rag_search'` — `prompt_tokens = 0, completion_tokens = 0` (DB lookup, not LLM)
- `feature = 'chat'` — has token usage (the GPT completion)

The `document_embedding` row was created earlier when the feedback was saved.

---

## Test 2 — Unrelated Question (Quality Gate)

**Goal:** Irrelevant chunks are discarded; AI does not fabricate evidence.

### Execute

1. In "Zephyr Rewards" (same project, same feedback), ask in AI Chat:
   ```
   What is the recipe for making sourdough bread?
   ```

### Verify

- [ ] AI does **NOT** reference loyalty points, quasar, or any project feedback.
- [ ] AI either answers generically or says something like "This doesn't relate to your project."

### Verify — Dev Logs

| Log | Expected |
|---|---|
| `[rag] Quality filter:` | `hasRelevantContext: false`, `usedChunks: 0` |
| `[chat] No relevant RAG context` | Should appear (warn level) |

---

## Test 3 — Cross-Project Isolation

**Goal:** Project A chat cannot retrieve Project B's feedback.

### Setup

1. Create project **"Moonbase Kitchen"**.
2. Add feedback:
   - **Title:** `Chef Survey Results`
   - **Content:** `The xylophone-pasta-maker prototype received mixed reviews. 8 of 12 chefs said noodle thickness was unintuitive. Vibration frequency selector confused all testers.`
   - **Source:** `Customer Interview`
3. Wait ~3 seconds.

### Execute

4. Switch to **"Zephyr Rewards"**.
5. In AI Chat, ask: `What feedback did we get about the xylophone-pasta-maker?`

### Verify

- [ ] AI does **NOT** mention "xylophone-pasta-maker", "noodle thickness", "vibration frequency", or any Moonbase Kitchen content.
- [ ] AI says something like "I don't have evidence about that in this project."

### Verify — Database (if suspicious)

```sql
-- Every xylophone chunk must belong to Moonbase Kitchen, not Zephyr Rewards
SELECT dc.project_id, p.name, LEFT(dc.content, 60)
FROM document_chunks dc JOIN projects p ON p.id = dc.project_id
WHERE dc.content ILIKE '%xylophone%';
```

---

## Test 4 — No Feedback at All

**Goal:** AI features work without any feedback documents (no chunks to retrieve).

### Execute

1. Create a new empty project **"Empty Project"** (no feedback added).
2. Go to AI Chat and ask any question.

### Verify

- [ ] AI responds (does not crash or error).
- [ ] AI does not claim to have evidence about the project.
- [ ] Dev logs show `hasRelevantContext: false` or no RAG logs at all.

---

## Test 5 — Feedback Deletion Removes Chunks

### Execute

1. In **"Zephyr Rewards"**, go to **Feedback & Research**.
2. Delete the "Beta Tester Batch 7 Summary" feedback document.
3. Ask in AI Chat about "quasar-loyalty-points" again.

### Verify

- [ ] AI no longer references the deleted feedback.

```sql
SELECT COUNT(*) FROM document_chunks WHERE project_id = '<ZEPHYR_PROJECT_ID>';
-- Expected: 0 (chunks removed when document deleted)
```

---

## What Not To Worry About

| Observation | Explanation |
|---|---|
| `rag_search` in `ai_usage` has 0 tokens | Expected — it's DB retrieval telemetry, not an LLM call |
| `query_embedding` has token usage | Expected — this is the embedding API call to generate the search vector |
| `document_embedding` has token usage | Expected — embedding the document chunks on save |
| Similarity scores vary between runs | Embedding similarity is approximate; scores depend on the text and model |
| Chat intent uses `minSimilarity: 0.72` but Decision Review uses `0.25` | Different intents have different thresholds in `lib/evidence/intent-config.ts` |
| Quality gate threshold (0.2) differs from intent thresholds | The base RAG layer uses 0.2; the Evidence Layer applies intent-specific thresholds on top |
| AI Chat response doesn't quote feedback verbatim | RAG injects context; the AI paraphrases. It may or may not use exact phrases. |
| Global AI Assistant (sidebar "AI Assistant") doesn't use RAG | Correct — it has no project context. Only per-project AI Chat uses RAG. |

---

## Pass/Fail Checklist

| # | Test | Key Assertion | Pass? |
|---|---|---|---|
| 1 | Relevant retrieval | AI response references feedback content | ☐ |
| 2 | Quality gate | Unrelated question → no evidence injected | ☐ |
| 3 | Cross-project isolation | No leakage between projects | ☐ |
| 4 | No feedback | AI works without evidence, doesn't crash | ☐ |
| 5 | Deletion | Deleted feedback no longer retrievable | ☐ |
