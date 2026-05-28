"use client";

import { Card } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Section {
  heading: string;
  level: number;
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Parsing helpers                                                    */
/* ------------------------------------------------------------------ */

const REDUNDANT_TITLE_PATTERNS = [
  /^product requirements document/i,
  /^prd\b/i,
  /^competitive analysis/i,
  /^product:/i,
];

function isRedundantTitle(heading: string): boolean {
  return REDUNDANT_TITLE_PATTERNS.some((p) => p.test(heading.trim()));
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");

  // First pass: detect heading structure to decide split level
  let h2Count = 0;
  let h3Count = 0;
  for (const line of lines) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) h2Count++;
    if (/^###\s+/.test(line) && !/^####/.test(line)) h3Count++;
  }

  // If only 1 (or 0) ## but many ###, promote ### to split level
  const promoteH3 = h2Count <= 1 && h3Count >= 2;

  const sections: Section[] = [];
  let currentHeading = "";
  let currentLevel = 0;
  let currentLines: string[] = [];

  function flush() {
    if (currentHeading || currentLines.length > 0) {
      sections.push({ heading: currentHeading, level: currentLevel, content: currentLines.join("\n").trim() });
    }
  }

  for (const line of lines) {
    const h3Match = promoteH3 ? line.match(/^###\s+(.+)$/) : null;
    const h2Match = !h3Match ? line.match(/^##\s+(.+)$/) : null;
    const h1Match = !h2Match && !h3Match ? line.match(/^#\s+(.+)$/) : null;

    if (h1Match) {
      flush();
      const title = h1Match[1].replace(/\*\*/g, "").trim();
      if (isRedundantTitle(title)) {
        currentHeading = "";
        currentLevel = 0;
        currentLines = [];
        continue;
      }
      currentHeading = title;
      currentLevel = 1;
      currentLines = [];
    } else if (h2Match) {
      flush();
      const title = h2Match[1].replace(/\*\*/g, "").trim();
      if (promoteH3 && isRedundantTitle(title)) {
        currentHeading = "";
        currentLevel = 0;
        currentLines = [];
        continue;
      }
      currentHeading = title;
      currentLevel = 2;
      currentLines = [];
    } else if (h3Match) {
      flush();
      currentHeading = h3Match[1].replace(/\*\*/g, "").trim();
      currentLevel = 3;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  flush();

  return sections.filter((s) => s.heading || s.content);
}

/* ------------------------------------------------------------------ */
/*  Inline text                                                        */
/* ------------------------------------------------------------------ */

function SafeText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|`.+?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-brand-700">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

function MarkdownTable({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (lines.length < 2) return null;

  const headerCells = lines[0].split("|").map((c) => c.trim()).filter(Boolean);
  const dataLines = lines.slice(2);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {headerCells.map((cell, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {cell.replace(/\*\*/g, "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dataLines.map((line, ri) => {
            const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
            return (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                {cells.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 text-gray-700">
                    <SafeText text={cell.replace(/\*\*/g, "")} />
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

/* ------------------------------------------------------------------ */
/*  Line-by-line content parser (fixes ### leakage bug)                */
/* ------------------------------------------------------------------ */

interface ContentBlock {
  type: "subheading" | "bullets" | "numbered" | "table" | "user-story" | "paragraph" | "footnote";
  content: string;
  items?: string[];
  level?: number;
}

function parseContentBlocks(text: string): ContentBlock[] {
  if (!text) return [];

  const blocks: ContentBlock[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // HR — skip
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) { i++; continue; }

    // ### / #### subheading
    const subMatch = trimmed.match(/^(#{3,4})\s+(.+)$/);
    if (subMatch) {
      blocks.push({ type: "subheading", content: subMatch[2].replace(/\*\*/g, ""), level: subMatch[1].length });
      i++;
      continue;
    }

    // Table
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i]); i++; }
      if (tableLines.length >= 2) blocks.push({ type: "table", content: tableLines.join("\n") });
      continue;
    }

    // Bullet list
    if (/^\s*[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "bullets", content: "", items });
      continue;
    }

    // Numbered list
    if (/^\s*\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "numbered", content: "", items });
      continue;
    }

    // User story
    if (/^as an?\s+/i.test(trimmed)) {
      blocks.push({ type: "user-story", content: trimmed });
      i++;
      continue;
    }

    // Italic footnote
    if (/^\*[^*]+\*$/.test(trimmed)) {
      blocks.push({ type: "footnote", content: trimmed.slice(1, -1) });
      i++;
      continue;
    }

    // Regular paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s/.test(lines[i].trim()) &&
      !/^\s*[-*•]\s/.test(lines[i]) &&
      !/^\s*\d+[.)]\s/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|") &&
      !/^-{3,}$/.test(lines[i].trim()) &&
      !/^\*{3,}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", content: paraLines.join("\n") });
    }
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/*  Rich content renderer                                              */
/* ------------------------------------------------------------------ */

function RichContent({ text }: { text: string }) {
  if (!text) return null;
  const blocks = parseContentBlocks(text);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "subheading":
            return (
              <h3 key={i} className={`font-semibold text-gray-800 pt-3 pb-1 ${block.level === 4 ? "text-xs uppercase tracking-wider text-gray-500" : "text-sm"}`}>
                {block.content}
              </h3>
            );
          case "table":
            return <MarkdownTable key={i} text={block.content} />;
          case "bullets":
            return (
              <ul key={i} className="space-y-1.5 pl-1" role="list">
                {block.items!.map((item, j) => (
                  <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                    <span><SafeText text={item} /></span>
                  </li>
                ))}
              </ul>
            );
          case "numbered":
            return (
              <ol key={i} className="space-y-1.5 pl-1 list-none">
                {block.items!.map((item, j) => (
                  <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
                    <span className="flex-shrink-0 font-semibold text-brand-600 w-5 text-right">{j + 1}.</span>
                    <span><SafeText text={item} /></span>
                  </li>
                ))}
              </ol>
            );
          case "user-story":
            return (
              <div key={i} className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3">
                <p className="text-sm italic text-indigo-800 leading-relaxed">
                  <SafeText text={block.content} />
                </p>
              </div>
            );
          case "footnote":
            return <p key={i} className="text-xs italic text-gray-400 leading-relaxed">{block.content}</p>;
          case "paragraph":
          default: {
            const pLines = block.content.split("\n");
            return (
              <p key={i} className="text-sm text-gray-700 leading-[1.8]">
                {pLines.map((line, li) => (
                  <span key={li}>
                    {li > 0 && <br />}
                    <SafeText text={line} />
                  </span>
                ))}
              </p>
            );
          }
        }
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section icons + tiers                                              */
/* ------------------------------------------------------------------ */

const SECTION_ICONS: Record<string, string> = {
  "executive summary": "📋",
  "problem statement": "🎯",
  "goals": "🏆",
  "objectives": "🏆",
  "goals & success metrics": "🏆",
  "success metrics": "📊",
  "kpis": "📊",
  "user stories": "👤",
  "user personas": "👤",
  "functional requirements": "⚙️",
  "requirements": "⚙️",
  "non-functional requirements": "🔧",
  "technical requirements": "🔧",
  "technical considerations": "🔧",
  "priorities": "📌",
  "mvp scope": "🚀",
  "scope": "🚀",
  "risks": "⚠️",
  "risk assessment": "⚠️",
  "open questions": "❓",
  "assumptions": "💡",
  "constraints": "🔒",
  "timeline": "📅",
  "milestones": "📅",
  "release plan": "📅",
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
  "appendix": "📎",
  "glossary": "📖",
  "dependencies": "🔗",
  "acceptance criteria": "✔️",
  "out of scope": "🚫",
};

function getSectionIcon(heading: string): string {
  const lower = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "📄";
}

type SectionTier = "hero" | "warning" | "default";

const HERO_KEYWORDS = ["executive summary", "market overview", "problem statement"];
const WARNING_KEYWORDS = ["risk", "threat", "constraint", "out of scope"];

function getSectionTier(heading: string): SectionTier {
  const lower = heading.toLowerCase();
  if (HERO_KEYWORDS.some((k) => lower.includes(k))) return "hero";
  if (WARNING_KEYWORDS.some((k) => lower.includes(k))) return "warning";
  return "default";
}

/* ------------------------------------------------------------------ */
/*  Sticky sidebar TOC                                                 */
/* ------------------------------------------------------------------ */

function TableOfContents({ sections, activeIndex }: { sections: { heading: string; index: number }[]; activeIndex: number }) {
  return (
    <nav className="hidden xl:block sticky top-24 w-52 flex-shrink-0 self-start" aria-label="Document outline">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Contents</p>
      <ol className="space-y-0.5 border-l border-gray-200">
        {sections.map((s) => (
          <li key={s.index}>
            <a
              href={`#doc-section-${s.index}`}
              className={`block border-l-2 py-1 pl-3 text-xs leading-snug transition-colors ${
                s.index === activeIndex
                  ? "border-brand-500 font-medium text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {s.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function InlineTOC({ sections }: { sections: { heading: string; index: number }[] }) {
  const [open, setOpen] = useState(false);
  if (sections.length < 3) return null;

  return (
    <nav className="xl:hidden rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500"
        aria-expanded={open}
      >
        <span>Contents ({sections.length} sections)</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ol className="mt-3 columns-2 gap-x-6 space-y-1 text-sm">
          {sections.map((s) => (
            <li key={s.index}>
              <a
                href={`#doc-section-${s.index}`}
                className="text-gray-600 hover:text-brand-600 transition"
                onClick={() => setOpen(false)}
              >
                <span className="mr-1.5 text-gray-300">{s.index}.</span>
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Section card                                                       */
/* ------------------------------------------------------------------ */

function SectionCard({ section, index, tier, icon }: { section: Section; index: number; tier: SectionTier; icon: string }) {
  const styles = {
    hero:    { card: "border-brand-200 bg-brand-50/20", border: "border-brand-100", iconBg: "bg-brand-100" },
    warning: { card: "border-amber-200 bg-amber-50/20", border: "border-amber-100", iconBg: "bg-amber-100" },
    default: { card: "",                                 border: "border-gray-100",  iconBg: "bg-gray-100" },
  }[tier];

  return (
    <section id={`doc-section-${index}`} aria-labelledby={`section-heading-${index}`}>
      <Card className={styles.card}>
        <div className={`mb-4 flex items-center gap-2.5 border-b ${styles.border} pb-3`}>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${styles.iconBg} text-sm`} aria-hidden="true">{icon}</span>
          <h2 id={`section-heading-${index}`} className="text-base font-semibold text-gray-900">{section.heading}</h2>
          {tier === "default" && <span className="ml-auto text-xs font-medium text-gray-300" aria-hidden="true">{index}</span>}
        </div>
        <div className="max-w-prose">
          <RichContent text={section.content} />
        </div>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Scroll spy                                                         */
/* ------------------------------------------------------------------ */

function useScrollSpy(tocEntries: { heading: string; index: number }[]) {
  const [activeIndex, setActiveIndex] = useState(1);

  useEffect(() => {
    if (tocEntries.length < 4) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const match = entry.target.id.match(/^doc-section-(\d+)$/);
            if (match) setActiveIndex(parseInt(match[1], 10));
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const s of tocEntries) {
      const el = document.getElementById(`doc-section-${s.index}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [tocEntries]);

  return activeIndex;
}

/* ------------------------------------------------------------------ */
/*  Main renderer                                                      */
/* ------------------------------------------------------------------ */

export function DocumentRenderer({ content, maxWidth = "max-w-3xl" }: { content: string; maxWidth?: string }) {
  const parsed = useMemo(() => {
    if (!content || content.trim().length === 0) return null;

    const sections = parseSections(content);

    if (sections.length <= 1 && !sections[0]?.heading) {
      return { sections, tocEntries: [], metaMap: new Map(), hasSidebar: false, fallback: true };
    }

    let sectionCounter = 0;
    const tocEntries: { heading: string; index: number }[] = [];
    const metaMap = new Map<number, { index: number; tier: SectionTier; icon: string }>();

    sections.forEach((s, i) => {
      if (s.heading) {
        sectionCounter++;
        tocEntries.push({ heading: s.heading, index: sectionCounter });
        metaMap.set(i, { index: sectionCounter, tier: getSectionTier(s.heading), icon: getSectionIcon(s.heading) });
      }
    });

    return { sections, tocEntries, metaMap, hasSidebar: tocEntries.length >= 4, fallback: false };
  }, [content]);

  if (!parsed) {
    return (
      <Card className="text-center py-12">
        <p className="text-sm text-gray-500">No content available.</p>
      </Card>
    );
  }

  if (parsed.fallback) {
    return (
      <Card>
        <div className="max-w-prose"><RichContent text={content} /></div>
      </Card>
    );
  }

  return (
    <DocumentRendererInner
      sections={parsed.sections}
      tocEntries={parsed.tocEntries}
      metaMap={parsed.metaMap}
      hasSidebar={parsed.hasSidebar}
      maxWidth={maxWidth}
    />
  );
}

/** Inner component that can use hooks */
function DocumentRendererInner({
  sections,
  tocEntries,
  metaMap,
  hasSidebar,
  maxWidth,
}: {
  sections: Section[];
  tocEntries: { heading: string; index: number }[];
  metaMap: Map<number, { index: number; tier: SectionTier; icon: string }>;
  hasSidebar: boolean;
  maxWidth: string;
}) {
  const activeIndex = useScrollSpy(tocEntries);

  return (
    <div className={hasSidebar ? "flex gap-8 items-start" : ""}>
      {hasSidebar && <TableOfContents sections={tocEntries} activeIndex={activeIndex} />}

      <div className={`${maxWidth} min-w-0 flex-1 space-y-4`}>
        {hasSidebar && <InlineTOC sections={tocEntries} />}

        {sections.map((section, i) => {
          if (!section.content && !section.heading) return null;

          if (!section.heading && section.content) {
            return (
              <Card key={i} className="border-brand-200 bg-brand-50/30">
                <div className="max-w-prose"><RichContent text={section.content} /></div>
              </Card>
            );
          }

          const meta = metaMap.get(i);
          if (!meta) return null;

          return (
            <SectionCard key={i} section={section} index={meta.index} tier={meta.tier} icon={meta.icon} />
          );
        })}
      </div>
    </div>
  );
}
