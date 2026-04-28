export interface ProjectContext {
  id: string;
  project_id: string;
  product_overview: string | null;
  target_personas: string | null;
  current_metrics: string | null;
  pain_points: string | null;
  competitors: string | null;
  strategic_goals: string | null;
  constraints: string | null;
  open_questions: string | null;
  created_at: string;
  updated_at: string;
}

export type ContextSectionKey =
  | "product_overview"
  | "target_personas"
  | "current_metrics"
  | "pain_points"
  | "competitors"
  | "strategic_goals"
  | "constraints"
  | "open_questions";

export interface ContextSection {
  key: ContextSectionKey;
  label: string;
  placeholder: string;
  description: string;
  icon: string;
}

export const CONTEXT_SECTIONS: ContextSection[] = [
  {
    key: "product_overview",
    label: "Product Overview",
    placeholder: "Describe what your product does, its core value proposition, and how it works...",
    description: "A concise summary of what the product is and the value it delivers.",
    icon: "\u{1F4E6}",
  },
  {
    key: "target_personas",
    label: "Target Personas",
    placeholder: "Describe your ideal users \u2014 their roles, behaviors, needs...",
    description: "Who are the people you\u2019re building for?",
    icon: "\u{1F465}",
  },
  {
    key: "current_metrics",
    label: "Current Metrics",
    placeholder: "Share key metrics: MAU, retention, conversion rates, revenue, NPS...",
    description: "Quantitative data that describes where the product stands today.",
    icon: "\u{1F4CA}",
  },
  {
    key: "pain_points",
    label: "Customer Pain Points",
    placeholder: "List the top problems your users face...",
    description: "The frustrations and unmet needs your customers experience.",
    icon: "\u{1F525}",
  },
  {
    key: "competitors",
    label: "Competitors",
    placeholder: "List key competitors, their strengths, weaknesses...",
    description: "Your competitive landscape and positioning.",
    icon: "\u2694\uFE0F",
  },
  {
    key: "strategic_goals",
    label: "Strategic Goals",
    placeholder: "What are the top 3-5 goals for this quarter or year?",
    description: "The outcomes you\u2019re working toward.",
    icon: "\u{1F3AF}",
  },
  {
    key: "constraints",
    label: "Constraints",
    placeholder: "Technical limitations, team size, budget, regulatory requirements...",
    description: "Boundaries and limitations that shape what\u2019s feasible.",
    icon: "\u{1F6A7}",
  },
  {
    key: "open_questions",
    label: "Open Questions",
    placeholder: "What are you unsure about? What decisions are pending?",
    description: "Unresolved questions the AI can help you think through.",
    icon: "\u2753",
  },
];
