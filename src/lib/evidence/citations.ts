/**
 * Evidence Layer – Citation utilities.
 *
 * Transforms EvidenceCandidate arrays into citation-ready references
 * for use in AI prompts and decision review workflows.
 */

import type { EvidenceCandidate, EvidenceCitation } from "./types";

const MAX_SNIPPET_LENGTH = 300;

/**
 * Create numbered citations from evidence candidates.
 */
export function createEvidenceCitations(
  candidates: EvidenceCandidate[],
): EvidenceCitation[] {
  return candidates.map((c, i) => ({
    citationId: `[${i + 1}]`,
    chunkId: c.chunkId,
    sourceType: c.sourceType,
    sourceId: c.sourceId,
    sourceTitle: c.sourceTitle,
    snippet:
      c.content.length > MAX_SNIPPET_LENGTH
        ? c.content.slice(0, MAX_SNIPPET_LENGTH).trimEnd() + "…"
        : c.content,
    similarityScore: c.similarityScore,
  }));
}

/**
 * Format evidence candidates as a prompt-ready context block.
 *
 * Each chunk is labeled with a citation ID, source type, and title
 * so the LLM can reference them in its output.
 */
export function formatEvidenceForPrompt(
  candidates: EvidenceCandidate[],
): string {
  if (candidates.length === 0) return "";

  const lines: string[] = [
    "\n--- Retrieved Evidence ---",
  ];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const label = `[${i + 1}]`;
    const source = c.sourceTitle
      ? `${c.sourceType}: "${c.sourceTitle}"`
      : c.sourceType;

    // Sanitize content to mitigate prompt injection
    const sanitized = c.content
      .replace(/---+/g, "—")
      .replace(/^(system|assistant|user)\s*:/gim, "[$1]:");

    lines.push(
      `\n${label} (${source}, similarity: ${c.similarityScore.toFixed(2)})`,
      sanitized,
    );
  }

  return lines.join("\n");
}

