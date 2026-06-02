import { describe, it, expect } from "vitest";
import { stripMarkdownFence } from "../copy-markdown";

// ── Fence unwrapping ────────────────────────────────────────────────

describe("stripMarkdownFence — fence unwrapping", () => {
  it("strips outer ```markdown fence", () => {
    const input = "```markdown\n# Hello\n\nWorld\n```";
    expect(stripMarkdownFence(input)).toBe("# Hello\n\nWorld");
  });

  it("strips outer ```md fence", () => {
    const input = "```md\n# Hello\n\nWorld\n```";
    expect(stripMarkdownFence(input)).toBe("# Hello\n\nWorld");
  });

  it("strips outer bare ``` fence (no language tag)", () => {
    const input = "```\n# Hello\n\nWorld\n```";
    expect(stripMarkdownFence(input)).toBe("# Hello\n\nWorld");
  });

  it("handles leading/trailing whitespace around outer fence", () => {
    const input = "  \n```markdown\nContent here\n```\n  ";
    expect(stripMarkdownFence(input)).toBe("Content here");
  });

  it("handles trailing whitespace after closing fence", () => {
    const input = "```markdown\nContent\n```   ";
    expect(stripMarkdownFence(input)).toBe("Content");
  });

  it("handles whitespace between opening tag and newline", () => {
    const input = "```markdown  \nContent\n```";
    expect(stripMarkdownFence(input)).toBe("Content");
  });
});

// ── No-fence passthrough ────────────────────────────────────────────

describe("stripMarkdownFence — no-fence passthrough", () => {
  it("returns plain text unchanged (trimmed)", () => {
    expect(stripMarkdownFence("Just plain text")).toBe("Just plain text");
  });

  it("returns trimmed result for input with outer whitespace", () => {
    expect(stripMarkdownFence("  some content  ")).toBe("some content");
  });

  it("returns empty string for empty input", () => {
    expect(stripMarkdownFence("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(stripMarkdownFence("   \n  \n  ")).toBe("");
  });
});

// ── Unsupported language fences ─────────────────────────────────────

describe("stripMarkdownFence — unsupported language tags", () => {
  it("does not strip ```json fence", () => {
    const input = "```json\n{\"key\": \"value\"}\n```";
    // The regex only matches markdown/md/bare — json should pass through
    expect(stripMarkdownFence(input)).toBe(input);
  });
});

// ── Inner fence preservation ────────────────────────────────────────

describe("stripMarkdownFence — inner fence preservation", () => {
  it("preserves inner code block when outer markdown fence is stripped", () => {
    const inner = "# Title\n\n```python\nprint('hello')\n```\n\nMore text";
    const input = `\`\`\`markdown\n${inner}\n\`\`\``;
    const result = stripMarkdownFence(input);
    expect(result).toContain("```python");
    expect(result).toContain("print('hello')");
    expect(result).toContain("```");
    expect(result).toBe(inner);
  });

  it("preserves multiple inner code blocks", () => {
    const inner = "# Doc\n\n```js\nfoo();\n```\n\nText\n\n```css\nbody {}\n```";
    const input = `\`\`\`markdown\n${inner}\n\`\`\``;
    const result = stripMarkdownFence(input);
    expect(result).toContain("```js");
    expect(result).toContain("```css");
    expect(result).toBe(inner);
  });
});

// ── Partial / malformed fences ──────────────────────────────────────

describe("stripMarkdownFence — partial and malformed fences", () => {
  it("does not strip opening fence without closing fence", () => {
    const input = "```markdown\nSome content without closing";
    expect(stripMarkdownFence(input)).toBe(input);
  });

  it("does not strip closing fence without opening fence", () => {
    const input = "Some content\n```";
    expect(stripMarkdownFence(input)).toBe(input);
  });

  it("does not strip fence embedded in larger text", () => {
    const input = "Before\n```markdown\nContent\n```\nAfter";
    // Not a full-wrap — there's text before and after
    expect(stripMarkdownFence(input)).toBe(input);
  });

  it("does not strip fence when content is on same line as opening", () => {
    // No newline after opening fence — regex requires \n
    const input = "```markdown content\n```";
    // This doesn't match because "markdown content" isn't "markdown" + \s*\n
    expect(stripMarkdownFence(input)).toBe(input);
  });
});

// ── Empty content inside fence ──────────────────────────────────────

describe("stripMarkdownFence — empty content", () => {
  it("returns empty string for fence wrapping empty content", () => {
    const input = "```markdown\n\n```";
    expect(stripMarkdownFence(input)).toBe("");
  });
});

