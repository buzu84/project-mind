/** Type for the project_context table row */
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

/** The section keys that map to columns in project_context */
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
    placeholder: "Describe what your product does, its core value proposition, and how it works at a high level…",
    description: "A concise summary of what the product is and the value it delivers.",
    icon: "📦",
  },
  {
    key: "target_personas",
    label: "Target Personas",
    placeholder: "Describe your ideal users — their roles, behaviors, needs, and demographics…",
    description: "Who are the people you're building for? Define their profiles and motivations.",
    icon: "👥",
  },
  {
    key: "current_metrics",
    label: "Current Metrics",
    placeholder: "Share key metrics: MAU, retention, conversion rates, revenue, NPS, churn…",
    description: "Quantitative data that describes where the product stands today.",
    icon: "📊",
  },
  {
    key: "pain_points",
    label: "Customer Pain Points",
    placeholder: "List the top problems your users face — from feedback, support tickets, or interviews…",
    description: "The frustrations and unmet needs your customers experience.",
    icon: "🔥",
  },
  {
    key: "competitors",
    label: "Competitors",
    placeholder: "List key competitors, their strengths, weaknesses, and how you differentiate…",
    description: "Your competitive landscape and positioning.",
    icon: "⚔️",
  },
  {
    key: "strategic_goals",
    label: "Strategic Goals",
    placeholder: "What are the top 3-5 goals for this quarter or year? What does success look like?",
    description: "The outcomes you're working toward and how you'll measure them.",
    icon: "🎯",
  },
  {
    key: "constraints",
    label: "Constraints",
    placeholder: "Technical limitations, team size, budget, regulatory requirements, timelines…",
    description: "Boundaries and limitations that shape what's feasible.",
    icon: "🚧",
  },
  {
    key: "open_questions",
    label: "Open Questions",
    placeholder: "What are you unsure about? What decisions are pending? What do you need to validate?",
    description: "Unresolved questions the AI can help you think through.",
    icon: "❓",
  },
];

