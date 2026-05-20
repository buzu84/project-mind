# RAG & Evidence Layer — Smoke Test Plan

> **Date:** 2026-05-05
> **Scope:** RPC vector search, project isolation, quality gate, evidence layer, build verification.
> **Prerequisite:** `npm run dev` running, `USE_MOCK_AUTH=true`, `USE_REAL_AI=true`, valid `OPENAI_API_KEY`, Supabase running with latest migrations applied.

---

## Test 1 — Relevant Project Feedback Retrieval

**Goal:** Chat retrieves and references matching feedback.

### Setup

1. Open the app → create (or open) a project called **"Zephyr Rewards"**.
2. Go to **Feedback** tab → **Add Feedback**.
3. Add this exact feedback document:
   - **Title:** `Beta Tester Batch 7 Summary`
   - **Content:**
     ```
     Users in beta batch 7 reported that the quasar-loyalty-points redemption flow
     has three major pain points: (1) unclear point balance visibility on mobile,
     (2) redemption confirmation takes over 8 seconds, and (3) no email receipt
     after redemption. 14 out of 20 testers rated the flow as "frustrating".
     ```
   - **Source:** `user_research`
4. Wait 2–3 seconds for ingestion (embedding + chunking) to complete.

### Execute

5. Go to **Chat** tab inside "Zephyr Rewards".
6. Ask this exact question:
   ```
   What are the main pain points with the loyalty points redemption flow?
   ```

### Verify — Logs (terminal running `npm run dev`)

| Log line | What to check |
|----------|---------------|
| `[rag] Vector search OK:` | Should appear. `fallback: false`. `rpcResults` ≥ 1. |
| `[rag] Quality filter:` | `hasRelevantContext: true`. `usedChunks` ≥ 1. `discardedChunks` can be 0. `minSimilarityUsed` ≥ 0.20. |
| `[rag] Chunks:` | Every chunk has `projMatch: true`. `sim` value shown (expect ≥ 0.30). `preview` contains recognizable feedback text. |

### Verify — Assistant Response

- [ ] Response mentions **"quasar-loyalty-points"** or **"point balance visibility"** or **"8 seconds"** or **"email receipt"** — at least one phrase from the feedback.
- [ ] Response does NOT fabricate additional data sources that were never added.

### Verify — If It Fails

| Symptom | Diagnosis |
|---------|-----------|
| `[rag] RPC returned 0 results` at all thresholds | Check `match_document_chunks` RPC uses `text` param with `::vector` cast. Run: `select count(*) from document_chunks where project_id = '<ID>';` |
| Chunks exist but similarity is 0 | Embedding dimension mismatch. Check `select array_length(embedding, 1) from document_chunks limit 1;` — should be 1536. |
| `hasRelevantContext: false` but chunks returned | All chunks have similarity < 0.20. Verify feedback was ingested correctly: `select id, content, project_id from document_chunks where project_id = '<ID>';` |
| No logs at all | Verify `NODE_ENV=development` in your `.env.local`. |

---

## Test 2 — Unrelated Question (Quality Gate)

**Goal:** Irrelevant chunks are discarded; model does not fabricate evidence.

### Prerequisite

Use the same **"Zephyr Rewards"** project from Test 1 (with the loyalty-points feedback already ingested).

### Execute

1. In Chat, ask this exact question:
   ```
   What is the recipe for making sourdough bread?
   ```

### Verify — Logs

| Log line | What to check |
|----------|---------------|
| `[rag] Vector search OK:` or `[rag] Vector search fell back to recent chunks:` | Either is acceptable. |
| `[rag] Quality filter:` | **`hasRelevantContext: false`** (critical). `usedChunks: 0`. `discardedChunks` ≥ 0 (chunks were retrieved but all below 0.20). |
| `[chat] No relevant RAG context for project` | Should appear as a `console.warn`. |

### Verify — Assistant Response

- [ ] Model does **NOT** reference loyalty points, quasar, or any project feedback.
- [ ] Model either answers the sourdough question generically, or says something like *"This doesn't seem related to your project. I can help with product decisions for Zephyr Rewards."*
- [ ] The `noContextWarning` system prompt injection fires — model should not fabricate evidence.

### Verify — If It Fails

| Symptom | Diagnosis |
|---------|-----------|
| `hasRelevantContext: true` for sourdough | `MIN_PROMPT_SIMILARITY` is not being applied. Check `context-builder.ts` line 89 filter. |
| Model references project feedback anyway | Quality gate is broken or `noContextWarning` is not in the system prompt. Check `chat/route.ts` lines 121–131. |

---

## Test 3 — Cross-Project Isolation

**Goal:** Project A chat cannot retrieve Project B feedback.

### Setup

1. Create a **second** project called **"Moonbase Kitchen"**.
2. Add feedback to **Moonbase Kitchen**:
   - **Title:** `Chef Survey Results`
   - **Content:**
     ```
     The xylophone-pasta-maker prototype received mixed reviews from professional
     chefs. 8 out of 12 chefs said the noodle thickness setting was unintuitive.
     The vibration frequency selector confused all testers. Recommended fix:
     replace numeric Hz input with descriptive presets like "thin", "medium", "thick".
     ```
   - **Source:** `user_research`
3. Wait 2–3 seconds for ingestion.

### Execute

4. **Switch to "Zephyr Rewards"** project (Project A).
5. In Chat, ask:
   ```
   What feedback did we get about the xylophone-pasta-maker?
   ```

### Verify — Logs

| Log line | What to check |
|----------|---------------|
| `[rag] Vector search OK:` | `projectId` matches **Zephyr Rewards** project ID, NOT Moonbase Kitchen. |
| `[rag] Chunks:` | Either empty, or every chunk has `projMatch: true`. **No chunk from Moonbase Kitchen**. |
| `[rag] Quality filter:` | `hasRelevantContext: false` (no matching chunks in Zephyr Rewards). |
| `[chat] No relevant RAG context` | Should appear. |

### Verify — Assistant Response

- [ ] Model does **NOT** mention "xylophone-pasta-maker", "noodle thickness", "vibration frequency", or any Moonbase Kitchen content.
- [ ] Model says something like *"I don't have access to feedback about that in this project"* or *"I don't have relevant evidence for that question."*

### Verify — Extra DB Check (if suspicious)

```sql
-- Confirm chunks are project-scoped
select dc.id, dc.project_id, p.name, left(dc.content, 60)
from document_chunks dc
join projects p on p.id = dc.project_id
order by dc.created_at desc
limit 10;
```

Every `xylophone-pasta-maker` chunk must have `project_id` = Moonbase Kitchen's UUID.

### Verify — If It Fails

| Symptom | Diagnosis |
|---------|-----------|
| Chunks from Moonbase Kitchen appear in Zephyr Rewards chat | `match_document_chunks` RPC is missing `where project_id = match_project_id`. Check `001_schema.sql`. |
| Model mentions xylophone-pasta-maker without chunks | LLM hallucination. Check that `noContextWarning` is injected (Test 2 logic). The project isolation system prompt should prevent this. |

---

## Test 4 — Evidence Layer Direct Test

**Goal:** `retrieveEvidence` filters low-quality candidates and respects project scoping.

### Method

Create a temporary dev-only API route. **Delete after testing.**

### Setup

Create file `src/app/api/dev/test-evidence/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { retrieveEvidence } from "@/lib/evidence/retrieval-service";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, query, intent } = await req.json();

  const result = await retrieveEvidence({
    userId: user.id,
    projectId,
    intent: intent ?? "chat",
    query,
  });

  return NextResponse.json({
    total: result.total,
    intent: result.intent,
    candidates: result.candidates.map((c) => ({
      chunkId: c.chunkId,
      similarityScore: c.similarityScore,
      sourceType: c.sourceType,
      sourceTitle: c.sourceTitle,
      contentPreview: c.content.slice(0, 100),
    })),
  });
}
```

### Execute

Use the **Zephyr Rewards** project ID. Run from terminal:

```bash
# Replace <PROJECT_ID> with actual UUID from the URL bar
curl -s -X POST http://localhost:3000/api/dev/test-evidence \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<PROJECT_ID>","query":"loyalty points redemption pain points","intent":"chat"}' \
  | python3 -m json.tool
```

### Verify — Output

```jsonc
{
  "total": 1,           // or more
  "intent": "chat",
  "candidates": [
    {
      "chunkId": "...",
      "similarityScore": 0.45,  // must be >= 0.72 (chat intent minSimilarity)
      "sourceType": "feedback",
      "sourceTitle": "Beta Tester Batch 7 Summary",
      "contentPreview": "Users in beta batch 7 reported that the quasar-loyalty..."
    }
  ]
}
```

**Checklist:**

- [ ] Every `similarityScore` ≥ `0.72` (chat intent config).
- [ ] No candidate from another project.
- [ ] `sourceTitle` matches the feedback document title.

### Execute — Unrelated Query

```bash
curl -s -X POST http://localhost:3000/api/dev/test-evidence \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<PROJECT_ID>","query":"recipe for sourdough bread","intent":"chat"}' \
  | python3 -m json.tool
```

**Expected:** `"total": 0, "candidates": []`

### Execute — Cross-Project (use Moonbase Kitchen project ID, ask about loyalty points)

```bash
curl -s -X POST http://localhost:3000/api/dev/test-evidence \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<MOONBASE_PROJECT_ID>","query":"loyalty points redemption","intent":"chat"}' \
  | python3 -m json.tool
```

**Expected:** `"total": 0` or candidates are only from Moonbase Kitchen (no loyalty-points content).

### Cleanup

**Delete** `src/app/api/dev/test-evidence/route.ts` after testing.

### If It Fails

| Symptom | Diagnosis |
|---------|-----------|
| Candidates with `similarityScore` < 0.72 | Quality filter in `retrieval-service.ts` not applied. Check `.filter((r) => r.similarity >= minSimilarity)` before `.map()`. |
| Candidates from wrong project | `searchSimilarChunks` not scoping by `projectId`. Check RPC and ownership check in `retrieveEvidence`. |
| `total: 0` for a relevant query | Intent `minSimilarity: 0.72` may be too high for text-embedding-3-small. Consider lowering to 0.5 for chat intent. |

---

## Test 5 — Build Verification

### Step 1: TypeScript

```bash
cd /Users/u756013/Work/project-mind
npx tsc --noEmit
```

- [ ] **Pass:** No output (exit code 0).
- [ ] **Fail:** Type errors listed. Fix the indicated file:line. Common causes: missing `qualityStats` in a return type, wrong property name.

### Step 2: Lint

```bash
npm run lint
```

- [ ] **Pass:** Only pre-existing warnings (e.g., `no-console`, `no-img-element`). No new errors.
- [ ] **Fail:** New errors appear. Fix lint violations. If `no-console` on a new log line, add `// eslint-disable-next-line no-console` above it.

### Step 3: Production Build

```bash
npm run build
```

- [ ] **Pass:** Build completes with route summary table. No `Build error` lines.
- [ ] **Fail:** Read the error. Common causes:
  - Import of deleted file → fix the import path.
  - Server/client boundary issue → ensure `"use server"` or `"use client"` directives are correct.
  - Dynamic import issue → check for top-level `await` in a non-async context.

---

## Summary Checklist

| # | Test | Key Assertion | Pass? |
|---|------|---------------|-------|
| 1 | Relevant feedback | `hasRelevantContext: true`, answer references feedback | ☐ |
| 2 | Unrelated question | `hasRelevantContext: false`, no fabricated evidence | ☐ |
| 3 | Cross-project isolation | No chunks from other project, model refuses | ☐ |
| 4a | Evidence — relevant query | All `similarityScore` ≥ intent min | ☐ |
| 4b | Evidence — unrelated query | `total: 0` | ☐ |
| 4c | Evidence — cross-project | No cross-project candidates | ☐ |
| 5a | `tsc --noEmit` | No type errors | ☐ |
| 5b | `npm run lint` | No new errors | ☐ |
| 5c | `npm run build` | Clean build | ☐ |

> **Note on intent thresholds:** The Evidence Layer intent configs use high `minSimilarity` values (0.60–0.72). With `text-embedding-3-small`, relevant matches often score 0.3–0.6. If Test 4a returns `total: 0` for clearly relevant queries, the intent thresholds need lowering — this is a tuning issue, not a bug.

