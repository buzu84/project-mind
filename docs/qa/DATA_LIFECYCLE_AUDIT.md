# Data Lifecycle, Consistency & Integrity Audit

**Date:** 2026-05-22  
**Scope:** Deletion integrity, transactional safety, embedding lifecycle, streaming consistency, usage tracking, ownership isolation, regeneration flows, edge cases.

---

## Deletion Lifecycle Findings

### Account Deletion (`/api/account/delete`)
- **What gets deleted:** ai_usage, global_chat_messages, 16 project-child tables (in FK dependency order), projects, profile, auth user.
- **Cleanup order:** Children → parents → profile → session → auth user. ✅ Correct.
- **Partial failure risk:** Each table deletion is individual; errors are logged but execution continues. If a child table delete fails, the parent delete may FK-fail (depending on CASCADE). However, since all child tables have `ON DELETE CASCADE` from projects, deleting projects would cascade anyway.
- **Orphan risk:** If auth user deletion fails (step 5), data is already deleted but the auth user persists. The user gets a 500 error and must contact support. **Acceptable** — the alternative (deleting auth first) would orphan the user from their data.
- **Retry safety:** Re-calling is safe (deletes are idempotent on empty tables).

### Roadmap Regeneration (`/api/ai/roadmap`)
- **Before fix:** Delete-then-insert. If insert failed after delete, data was lost.
- **After fix:** Insert-before-delete. New roadmap is saved first; old roadmaps deleted only after successful insert. ✅ Fixed.

### Insights Regeneration (`/api/ai/insights`)
- **Before fix:** Delete-then-insert. Same data loss risk.
- **After fix:** Insert-before-delete with `NOT IN` filter to keep new rows. ✅ Fixed.

### Decision Review Re-analysis (`decision-review-service.ts`)
- Already uses insert-before-delete strategy with `generated_by` marker tracking. ✅ Correct.
- Cleanup on recommendation insert failure rolls back newly inserted evidence/options/assumptions. ✅ Correct.
- `deleteOldRecords` properly skips non-AI-generated rows and verifies `generated_by`. ✅ Correct.
- **Edge case:** The `cleanupIds` function tries every ID against every table, which is wasteful but safe (no error on miss).

### Decision Deletion (`decisions/service.ts`)
- Deletes from `product_decisions` with `ON DELETE CASCADE` for options, assumptions, evidence links, recommendations, agent reviews. ✅ Correct via DB cascades.

### Legacy Decisions Table
- `decisions` table uses `ON DELETE CASCADE` from `projects`. ✅ Correct.
- PRD/competitive-analysis/prioritize routes insert into `decisions` but never delete old ones. **Acceptable** — these are append-only history records.

### Feedback/Document Deletion
- `document_chunks` has `ON DELETE CASCADE` from `feedback_documents`. ✅ Correct.
- `removeDocumentChunks()` explicitly deletes chunks (belt-and-suspenders). ✅ Correct.
- Embeddings in `document_chunks.embedding` column are deleted with the row. No separate vector store. ✅ Correct.

---

## Transaction/Integrity Findings

### Non-Atomic Multi-Write Operations
1. **Roadmap regeneration** — Fixed to insert-before-delete. Residual risk: if delete-old fails, duplicate roadmaps exist until next regeneration. **Acceptable.**
2. **Insights regeneration** — Fixed to insert-before-delete. Same residual risk. **Acceptable.**
3. **Decision review save** — Already insert-before-delete with rollback. ✅
4. **Score features** — Updates feature_ideas rows individually in a loop. If one update fails, others succeed. No data loss (updates, not replaces). **Acceptable.**
5. **Chat message save** — User message saved before AI call; assistant message saved after stream completes. Fixed to save partial content on stream failure. ✅

### Race Conditions
1. **Concurrent roadmap regeneration:** Two simultaneous requests could both insert, then both try to delete the other's row. Result: one roadmap survives. **Low risk** — UI sends one request at a time.
2. **Concurrent insights regeneration:** Same pattern. **Low risk.**
3. **Concurrent decision analysis:** Insert-before-delete with `newIds` set prevents deleting own records. Two concurrent analyses could leave duplicate records. **Low risk** — UI disables button during analysis.

### Duplicate-Write Risks
- **PRD/competitive-analysis/prioritize:** Each generation inserts a new `decisions` row. No dedup. Repeated clicks create duplicate history entries. **Acceptable** — these are history records, not singleton state.
- **Chat messages:** No dedup on user messages. Rapid double-click could insert two identical user messages. **Low risk** — UI should debounce.

---

## Embedding/Vector Lifecycle Findings

### When Created
- On feedback document ingestion via `ingestDocument()`. Chunks are created, embeddings generated via OpenAI, stored in `document_chunks.embedding`.

### When Deleted
- Via `ON DELETE CASCADE` from `feedback_documents` or `projects`. Also explicitly via `removeDocumentChunks()`.

### Stale Vector Risk
- If embedding generation fails mid-batch (`generateEmbeddings`), the entire call throws and no chunks are inserted (the insert happens after all embeddings are generated). ✅ No partial embedding state.
- **Re-ingestion:** No explicit "re-ingest" flow exists. If a feedback document is updated, old chunks remain alongside new content. **Noted** — no content update API exists currently, so this is theoretical.

### Duplicate Chunk Risk
- If `ingestDocument` is called twice for the same document (e.g., retry after timeout), duplicate chunks are inserted. No unique constraint on `(document_id, chunk_index)`.
- **Mitigation:** The function is only called server-side during document creation. **Low risk.**

### Cross-Project Isolation
- `match_document_chunks` RPC filters by `match_project_id`. ✅
- `vector-search.ts` includes dev-mode cross-project leak detection. ✅
- `retrieveEvidence` verifies project ownership before searching. ✅

---

## Streaming Consistency Findings

### Client Disconnect
- `ReadableStream` has no `cancel` handler. If the client disconnects, the `for await` loop continues consuming the OpenAI stream until completion, then the DB insert executes on content nobody will see.
- **Impact:** Wasted OpenAI tokens + an orphaned assistant message in the DB. The message is valid content, so it appears in history on next load. **Acceptable** — standard SSE behavior in Next.js.

### Mid-Stream OpenAI Error
- **Before fix:** Partial content was lost. User message existed without a matching assistant response, creating an odd chat history.
- **After fix:** Partial content is saved with `[Response interrupted]` marker. ✅ Fixed.
- Usage error is tracked with `partialContentLength` metadata. ✅

### Duplicate Assistant Messages
- Possible only if the stream completes successfully but the DB insert times out and the client retries. **Very low risk** — the client doesn't auto-retry failed streams.

### DB/UI State Divergence
- Mock mode: assistant message saved before streaming to client. If client disconnects during mock stream, message is already persisted. ✅ Consistent.
- Real mode: assistant message saved after stream completes. If save fails, client saw the content but it's not in DB. On refresh, the message is gone. **Acceptable** — save failure is extremely rare.

---

## AI Usage Tracking Findings

### Execution Guarantee
- All `trackAIUsage` calls use `void` (fire-and-forget). The function never throws (wrapped in try/catch). ✅
- If Supabase insert fails, error is logged but AI operation is not affected. ✅

### Failure Behavior
- AI generation can succeed while usage tracking fails. **By design** — usage tracking is non-critical.
- No retry on usage tracking failure. **Acceptable** — tracking is best-effort.

### Duplicate Usage Rows
- Each AI call tracks usage exactly once. Retry flows (decision review) track per-attempt, which is correct (each attempt consumes tokens).
- **Risk:** If the same request is retried by the client, usage is double-counted. **Acceptable** — this reflects actual token consumption.

### Feature Name Consistency
- Features used: `chat`, `prd`, `roadmap`, `insights`, `competitive_analysis`, `feature_prioritization`, `multi_agent_review`, `decision_review`, `document_embedding`, `query_embedding`, `rag_search`.
- All match the `AIUsageFeature` type. ✅

---

## Ownership Isolation Findings

### All Queries Scoped
- **Projects:** All queries filter by `user_id = auth.uid()` or `user_id = userId`. ✅
- **Product decisions:** All CRUD operations verify `user_id + project_id`. ✅
- **Messages:** Scoped by `project_id` (which is owned by user via RLS). ✅
- **Global chat:** Scoped by `user_id`. ✅
- **Insights/roadmaps/features:** Scoped by `project_id` (RLS-protected). ✅
- **Evidence retrieval:** `retrieveEvidence` verifies project ownership before search. ✅
- **Vector search:** RPC filters by `match_project_id`. ✅

### Legacy Decisions Route Bug (Fixed)
- **Before fix:** `/api/decisions` GET route filtered by `user_id` column that doesn't exist on the `decisions` table. This caused the query to silently return empty results or error.
- **After fix:** Removed bogus `user_id` filter. RLS policy enforces ownership via `project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())`. ✅ Fixed.

### Cross-Project Leakage
- No cross-project leakage paths found. All AI context building passes through project-scoped queries. ✅

---

## Race Conditions Found

1. **Concurrent regeneration** (roadmap, insights): Could result in duplicate records. Harmless — next regeneration cleans up. **Low risk.**
2. **Concurrent decision analysis:** Could leave duplicate AI-generated options/assumptions. Mitigated by `generated_by` marker and cleanup logic. **Low risk.**
3. **Rapid chat sends:** Could insert duplicate user messages. **Low risk** — UI responsibility.

---

## Cleanup/Order Issues Found

1. **Account deletion order** is correct (children → parents → auth). ✅
2. **Decision review cleanup** deletes old records only after new ones are confirmed saved. ✅
3. **Roadmap/insights regeneration** — Fixed to insert-before-delete. ✅
4. **Orphaned evidence cleanup** in decision review checks for remaining links before deleting. ✅

---

## Safe Fixes Implemented

| # | File | Fix |
|---|------|-----|
| 1 | `src/app/api/ai/roadmap/route.ts` | Insert-before-delete for roadmap regeneration |
| 2 | `src/app/api/ai/insights/route.ts` | Insert-before-delete for insights regeneration |
| 3 | `src/app/api/ai/chat/route.ts` | Save partial content on stream error; track partial length |
| 4 | `src/app/api/ai/global-chat/route.ts` | Save partial content on stream error; track partial length |
| 5 | `src/app/api/decisions/route.ts` | Remove non-existent `user_id` filter (RLS enforces ownership) |

---

## Docs Updated

| File | Change |
|------|--------|
| `docs/qa/DATA_LIFECYCLE_AUDIT.md` | Created (this document) |

---

## Remaining Acceptable Risks

1. **Client disconnect during streaming** wastes tokens and persists an unseen message. Standard SSE behavior.
2. **Concurrent regeneration** can temporarily create duplicate roadmaps/insights. Harmless; cleaned on next generation.
3. **No dedup on feedback document ingestion retry** — duplicate chunks possible but extremely unlikely in practice.
4. **Usage tracking is best-effort** — a small number of usage rows may be lost if Supabase is temporarily unavailable.
5. **Account deletion continues on child-table errors** — necessary to avoid leaving users in a half-deleted state.
6. **Legacy `decisions` table is append-only** — old PRD/competitive analysis records accumulate. No cleanup exists. Low priority since these are small JSON rows.

---

## Final Integrity Assessment

**Overall: GOOD.** The system handles partial failures reasonably well:

- **DB schema** uses `ON DELETE CASCADE` throughout, providing a strong safety net.
- **RLS policies** enforce ownership at the database level (defense-in-depth).
- **Insert-before-delete** pattern is now used consistently for all regeneration flows.
- **Streaming** now preserves partial content on failure instead of losing it.
- **Usage tracking** is correctly fire-and-forget with no impact on user-facing operations.
- **Ownership isolation** is complete — no cross-user or cross-project leakage paths found.
- **The legacy decisions route bug** (filtering by non-existent column) has been fixed.

No critical integrity issues remain. All identified risks are low-severity and acceptable for the current system scale.

