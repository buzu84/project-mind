import { describe, it, expect } from "vitest";
import { estimateTokens, chunkDocument } from "../chunker";
import type { DocumentChunk } from "../chunker";

// ── Helpers ─────────────────────────────────────────────────────────

/** Assert every chunk in the array satisfies basic structural invariants. */
function assertValidChunks(chunks: DocumentChunk[]): void {
  for (let i = 0; i < chunks.length; i++) {
    expect(chunks[i].index).toBe(i);
    expect(chunks[i].content.length).toBeGreaterThan(0);
    expect(chunks[i].tokenCount).toBeGreaterThan(0);
    expect(Number.isFinite(chunks[i].tokenCount)).toBe(true);
    // No accidental "undefined" or "null" leaking into content
    expect(chunks[i].content).not.toMatch(/\bundefined\b/);
    expect(chunks[i].content).not.toMatch(/\bnull\b/);
  }
}

/** Build a paragraph of roughly `charCount` characters. */
function makeParagraph(charCount: number, prefix = "word"): string {
  const unit = `${prefix} `;
  return unit.repeat(Math.ceil(charCount / unit.length)).slice(0, charCount);
}

/** Build multiple short paragraphs separated by blank lines. */
function makeParagraphs(count: number, charsEach: number): string {
  return Array.from({ length: count }, (_, i) =>
    makeParagraph(charsEach, `p${i}`),
  ).join("\n\n");
}

// ── estimateTokens ──────────────────────────────────────────────────

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 1 for 1–4 character strings", () => {
    expect(estimateTokens("a")).toBe(1);
    expect(estimateTokens("abcd")).toBe(1);
  });

  it("estimates tokens at ~4 chars per token", () => {
    // 20 chars → ceil(20/4) = 5
    expect(estimateTokens("a]".repeat(10))).toBe(5);
    // 21 chars → ceil(21/4) = 6
    expect(estimateTokens("a".repeat(21))).toBe(6);
  });

  it("applies Math.ceil so partial tokens round up", () => {
    // 5 chars → ceil(5/4) = 2, not 1
    expect(estimateTokens("abcde")).toBe(2);
    // 8 chars → ceil(8/4) = 2 (exact boundary, no rounding)
    expect(estimateTokens("abcdefgh")).toBe(2);
    // 9 chars → ceil(9/4) = 3
    expect(estimateTokens("abcdefghi")).toBe(3);
  });
});

// ── chunkDocument — empty / whitespace ──────────────────────────────

describe("chunkDocument — empty input", () => {
  it("returns [] for empty string", () => {
    expect(chunkDocument("")).toEqual([]);
  });

  it("returns [] for whitespace-only string", () => {
    expect(chunkDocument("   \n\n\t  ")).toEqual([]);
  });
});

// ── chunkDocument — single short paragraph ──────────────────────────

describe("chunkDocument — single short paragraph", () => {
  it("returns one chunk for text well under default chunk size", () => {
    const text = "This is a short paragraph about product decisions.";
    const chunks = chunkDocument(text);

    expect(chunks).toHaveLength(1);
    assertValidChunks(chunks);
    expect(chunks[0].content).toBe(text);
    expect(chunks[0].index).toBe(0);
  });

  it("trims leading/trailing whitespace from content", () => {
    const chunks = chunkDocument("  hello world  ");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("hello world");
  });
});

// ── chunkDocument — multiple paragraphs that fit ────────────────────

describe("chunkDocument — multiple short paragraphs within limit", () => {
  it("merges paragraphs into a single chunk when total fits", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = chunkDocument(text);

    expect(chunks).toHaveLength(1);
    assertValidChunks(chunks);
    // Paragraphs are merged — all content present
    expect(chunks[0].content).toContain("First paragraph.");
    expect(chunks[0].content).toContain("Second paragraph.");
    expect(chunks[0].content).toContain("Third paragraph.");
  });
});

// ── chunkDocument — paragraph boundary splitting ────────────────────

describe("chunkDocument — paragraph boundary splitting", () => {
  it("splits into multiple chunks when paragraphs exceed chunk size", () => {
    // Default chunk size: 500 tokens × 4 chars = 2000 chars.
    // Create 5 paragraphs of 600 chars each → ~3000 chars total.
    const text = makeParagraphs(5, 600);
    const chunks = chunkDocument(text);

    expect(chunks.length).toBeGreaterThan(1);
    assertValidChunks(chunks);
  });

  it("produces sequential indices starting from 0", () => {
    const text = makeParagraphs(6, 500);
    const chunks = chunkDocument(text);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("does not produce empty chunks", () => {
    const text = makeParagraphs(10, 400);
    const chunks = chunkDocument(text);

    for (const c of chunks) {
      expect(c.content.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── chunkDocument — long single paragraph (sentence fallback) ───────

describe("chunkDocument — long single paragraph", () => {
  it("splits a long paragraph with sentences into multiple chunks", () => {
    // One paragraph with many sentences, well over default 2000 char limit.
    const sentences = Array.from(
      { length: 40 },
      (_, i) => `Sentence number ${i} provides important context about the decision.`,
    );
    const text = sentences.join(" ");

    expect(text.length).toBeGreaterThan(2000);

    const chunks = chunkDocument(text);
    expect(chunks.length).toBeGreaterThan(1);
    assertValidChunks(chunks);

    // All sentence content should appear across chunks
    const allContent = chunks.map((c) => c.content).join(" ");
    expect(allContent).toContain("Sentence number 0");
    expect(allContent).toContain("Sentence number 39");
  });

  it("handles a long paragraph without sentence punctuation", () => {
    // No periods, exclamation marks, or question marks — sentence regex won't match.
    // Fallback: the entire paragraph is treated as one "sentence" that cannot
    // be split further. This is a known limitation — it produces one oversized
    // chunk rather than losing content.
    const text = makeParagraph(3000, "word");
    const chunks = chunkDocument(text);

    // Exactly one oversized chunk preserving all content
    expect(chunks).toHaveLength(1);
    assertValidChunks(chunks);
    expect(chunks[0].content).toBe(text.trim());
    // Token count reflects the full oversized content
    expect(chunks[0].tokenCount).toBe(estimateTokens(text.trim()));
  });
});

// ── chunkDocument — overlap behavior ────────────────────────────────

describe("chunkDocument — overlap", () => {
  it("consecutive chunks share overlapping content", () => {
    // Use small chunk size to force many chunks.
    // 10 tokens = 40 chars, overlap 2 tokens = 8 chars.
    const text = makeParagraphs(5, 60);
    const chunks = chunkDocument(text, 10, 2);

    expect(chunks.length).toBeGreaterThan(1);
    assertValidChunks(chunks);

    // Verify overlap: the tail of chunk N appears in chunk N+1
    for (let i = 0; i < chunks.length - 1; i++) {
      const tailOfCurrent = chunks[i].content.slice(-8); // overlapChars = 2 * 4 = 8
      // The next chunk should contain the overlap text (possibly trimmed)
      expect(chunks[i + 1].content).toContain(tailOfCurrent.trim());
    }
  });
});

// ── chunkDocument — custom options ──────────────────────────────────

describe("chunkDocument — custom chunk size and overlap", () => {
  it("respects a small custom chunkSize", () => {
    const text = "Alpha bravo charlie. Delta echo foxtrot. Golf hotel india.";
    // 5 tokens = 20 chars max per chunk
    const chunks = chunkDocument(text, 5, 0);

    expect(chunks.length).toBeGreaterThan(1);
    assertValidChunks(chunks);
  });

  it("respects custom overlap of 0 (no overlap)", () => {
    const text = makeParagraphs(4, 60);
    const chunks = chunkDocument(text, 10, 0);

    expect(chunks.length).toBeGreaterThan(1);
    assertValidChunks(chunks);
  });

  it("does not infinite-loop when overlap equals chunk size", () => {
    const text = "Some text that is longer than the tiny chunk limit we set.";
    // overlap === chunkSize: degenerate but should not loop forever.
    const chunks = chunkDocument(text, 5, 5);

    // Just verify it terminates and produces valid chunks.
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    assertValidChunks(chunks);
  });
});

// ── chunkDocument — determinism ─────────────────────────────────────

describe("chunkDocument — determinism", () => {
  it("produces identical output for identical input", () => {
    const text = makeParagraphs(4, 600);
    const first = chunkDocument(text);
    const second = chunkDocument(text);

    expect(first).toEqual(second);
  });
});



