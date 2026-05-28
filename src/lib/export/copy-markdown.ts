/**
 * Strip outer fenced-code wrappers that AI models sometimes add around
 * markdown output (e.g. ` ```markdown\n…\n``` `).  Only the outermost
 * wrapper is removed — inner fenced blocks are preserved.
 */
export function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n\s*```\s*$/);
  return match ? match[1] : trimmed;
}

/**
 * Clipboard helper for copying markdown text.
 * Automatically strips outer fenced-code wrappers before copying.
 * Returns true on success, false on failure.
 */
export async function copyMarkdownToClipboard(markdown: string): Promise<boolean> {
  if (!markdown.trim()) return false;

  const cleaned = stripMarkdownFence(markdown);

  try {
    await navigator.clipboard.writeText(cleaned);
    return true;
  } catch {
    // Fallback for older browsers / non-HTTPS contexts
    try {
      const textarea = document.createElement("textarea");
      textarea.value = cleaned;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

