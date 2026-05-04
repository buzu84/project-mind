"use client";

import { Card } from "@/components/ui/card";

/**
 * Parse markdown content into sections based on ## headings.
 * Returns structured sections for card-based rendering.
 */
interface Section {
  heading: string;
  content: string;
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    // Match ## or # headings (not inside code blocks)
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      // Save previous section
      if (currentHeading || currentLines.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join("\n").trim(),
        });
      }
      currentHeading = headingMatch[1].replace(/\*\*/g, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push final section
  if (currentHeading || currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.heading || s.content);
}

/** Render a markdown table as an HTML table */
function MarkdownTable({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  if (lines.length < 2) return null;

  // Parse header
  const headerCells = lines[0]
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);

  // Skip separator row (line with dashes)
  const dataLines = lines.slice(2);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {headerCells.map((cell, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                {cell.replace(/\*\*/g, "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dataLines.map((line, ri) => {
            const cells = line
              .split("|")
              .map((c) => c.trim())
              .filter(Boolean);
            return (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                {cells.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 text-gray-700">
                    {cell.replace(/\*\*/g, "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Render markdown content with basic formatting */
function RichContent({ text }: { text: string }) {
  if (!text) return null;

  // Split by blank lines to get paragraphs / blocks
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Table block
        if (trimmed.includes("|") && trimmed.split("\n").filter((l) => l.trim().startsWith("|")).length >= 2) {
          return <MarkdownTable key={i} text={trimmed} />;
        }

        // Bullet list block
        if (trimmed.split("\n").every((l) => /^\s*[-*•]\s/.test(l) || l.trim() === "")) {
          const items = trimmed
            .split("\n")
            .map((l) => l.replace(/^\s*[-*•]\s+/, "").trim())
            .filter(Boolean);
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                  <span><SafeText text={item} /></span>
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list block
        if (trimmed.split("\n").every((l) => /^\s*\d+[.)]\s/.test(l) || l.trim() === "")) {
          const items = trimmed
            .split("\n")
            .map((l) => l.replace(/^\s*\d+[.)]\s+/, "").trim())
            .filter(Boolean);
          return (
            <ol key={i} className="space-y-1.5 pl-1 list-none">
              {items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm text-gray-700">
                  <span className="flex-shrink-0 font-medium text-gray-500 w-5 text-right">{j + 1}.</span>
                  <span><SafeText text={item} /></span>
                </li>
              ))}
            </ol>
          );
        }

        // Regular paragraph
        const lines = trimmed.split("\n");
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                <SafeText text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Convert **bold** to React elements safely (no innerHTML) */
function SafeText({ text }: { text: string }) {
  // Split by **bold** markers
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** Section icon mapping */
const SECTION_ICONS: Record<string, string> = {
  "executive summary": "📋",
  "problem statement": "🎯",
  "goals": "🏆",
  "objectives": "🏆",
  "success metrics": "📊",
  "kpis": "📊",
  "user stories": "👤",
  "functional requirements": "⚙️",
  "requirements": "⚙️",
  "non-functional requirements": "🔧",
  "technical requirements": "🔧",
  "priorities": "📌",
  "mvp scope": "🚀",
  "scope": "🚀",
  "risks": "⚠️",
  "open questions": "❓",
  "assumptions": "💡",
  "timeline": "📅",
  "milestones": "📅",
  "market overview": "🌍",
  "competitor profiles": "🏢",
  "competitors": "🏢",
  "competitor analysis": "🏢",
  "positioning": "📍",
  "strengths": "💪",
  "weaknesses": "📉",
  "opportunities": "🌟",
  "threats": "⚡",
  "swot": "📊",
  "swot analysis": "📊",
  "differentiation": "✨",
  "feature comparison": "📋",
  "feature matrix": "📋",
  "recommended next moves": "🎯",
  "recommendations": "🎯",
  "next steps": "➡️",
  "conclusion": "✅",
  "summary": "📝",
};

function getSectionIcon(heading: string): string {
  const lower = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "📄";
}

/**
 * Render structured document content as a series of cards.
 * Parses markdown headings into separate sections.
 */
export function DocumentRenderer({ content, maxWidth = "max-w-3xl" }: { content: string; maxWidth?: string }) {
  if (!content || content.trim().length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-sm text-gray-500">No content available.</p>
      </Card>
    );
  }

  const sections = parseSections(content);

  // If no headings detected, render as a single formatted card
  if (sections.length <= 1 && !sections[0]?.heading) {
    return (
      <Card>
        <RichContent text={content} />
      </Card>
    );
  }

  return (
    <div className={`${maxWidth} space-y-4`}>
      {sections.map((section, i) => {
        // Skip empty sections
        if (!section.content && !section.heading) return null;

        // Preamble (content before first heading)
        if (!section.heading && section.content) {
          return (
            <Card key={i}>
              <RichContent text={section.content} />
            </Card>
          );
        }

        const icon = getSectionIcon(section.heading);

        return (
          <Card key={i}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <h3 className="text-base font-semibold text-gray-900">{section.heading}</h3>
            </div>
            <RichContent text={section.content} />
          </Card>
        );
      })}
    </div>
  );
}

