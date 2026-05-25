/**
 * Clipboard helper for copying markdown text.
 * Returns true on success, false on failure.
 */
export async function copyMarkdownToClipboard(markdown: string): Promise<boolean> {
  if (!markdown.trim()) return false;

  try {
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch {
    // Fallback for older browsers / non-HTTPS contexts
    try {
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
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

