import type { WithContext, SoftwareApplication, Organization, FAQPage, BreadcrumbList } from "schema-dts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://productmind.app";

export const organizationJsonLd: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ProductMind",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "AI-powered product management workspace for PMs, founders, and product leads.",
  foundingDate: "2026",
  sameAs: [],
};

export const softwareApplicationJsonLd: WithContext<SoftwareApplication> = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ProductMind",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "AI-powered product management workspace that helps product managers generate PRDs, prioritize roadmaps, and run competitive analysis — grounded in project context via retrieval-augmented generation.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free early-access plan with rate-limited AI operations (20 standard/hour, 5 heavy/15 min)",
  },
  featureList: [
    "AI-powered PRD generation",
    "Feature prioritization with RICE and ICE frameworks",
    "Competitive landscape analysis",
    "RAG-powered project chat and roadmap generation",
    "Multi-agent product review with four AI personas",
    "Evidence-grounded decision reviews with confidence scoring",
  ],
  screenshot: `${SITE_URL}/screenshot.png`,
  author: organizationJsonLd,
};

export const faqItems = [
  {
    question: "What exactly does ProductMind do?",
    answer:
      "ProductMind is an AI-powered workspace for product managers and founders. It helps you generate structured PRDs, prioritize features using RICE and ICE frameworks, run competitive landscape analysis, build roadmaps, and get multi-perspective product reviews — all from a single project workspace. Think of it as an AI co-pilot for the strategic side of product management.",
  },
  {
    question: "Who is ProductMind built for?",
    answer:
      "ProductMind is designed for product managers, startup founders, and product leads who need to make faster, more structured product decisions. It's especially useful for solo PMs or small teams who don't have dedicated analysts, strategists, or research teams.",
  },
  {
    question: "How does the AI actually work under the hood?",
    answer:
      "ProductMind uses OpenAI's GPT-4o for generation tasks and text-embedding-3-small for semantic search. When you upload feedback documents, they're chunked, embedded, and stored in a vector database (pgvector). AI features like project chat, roadmap generation, multi-agent review, and decision review use retrieval-augmented generation (RAG) to ground outputs in your uploaded feedback. Other features like PRD generation and competitive analysis use your project metadata directly. All outputs are grounded in your project context — not generic responses.",
  },
  {
    question: "Can I edit the AI-generated content?",
    answer:
      "AI outputs — PRDs, roadmaps, competitive analyses, decision reviews — are structured starting points designed for human review. You can regenerate any output with updated context. In-app editing and export of individual generated fields is on the roadmap. We strongly recommend reviewing and validating all generated content before acting on it.",
  },
  {
    question: "Is my data stored securely?",
    answer:
      "All data is stored in a Supabase-managed PostgreSQL database with row-level security (RLS) enabled. Each user can only access their own projects and data. Authentication is handled via Supabase Auth with email confirmation. We do not share your data with third parties beyond the AI model provider (OpenAI) for processing requests.",
  },
  {
    question: "Is ProductMind free?",
    answer:
      "ProductMind currently offers free access during its early-access phase. AI operations are rate-limited (20 standard operations per hour, 5 heavy operations per 15 minutes) to manage costs. A paid tier with higher limits is planned for the future.",
  },
  {
    question: "How does roadmap prioritization work?",
    answer:
      "ProductMind generates prioritized roadmaps using your project context, feature list, and goals. It produces a Now/Next/Later view and a 30/60/90-day action plan, including risk assessment, dependencies, and success metrics. Prioritization is informed by RICE scoring, strategic alignment, and any feedback documents you've uploaded.",
  },
  {
    question: "What does competitive analysis cover?",
    answer:
      "The competitive analysis generator identifies key competitors, compares feature sets, analyzes positioning and pricing strategies, and highlights market gaps and opportunities. Results are structured and stored per project, so you can revisit and update them as your market evolves.",
  },
  {
    question: "What are the AI's limitations?",
    answer:
      "AI outputs are based on the context you provide and the model's training data — they can be incomplete, biased, or incorrect. ProductMind is a decision-support tool, not a decision-making tool. We recommend treating all generated content as a well-informed draft that requires human judgment, domain expertise, and validation before acting on it.",
  },
  {
    question: "What is the multi-agent review?",
    answer:
      "The multi-agent review runs your project through four AI personas — a Product Manager, CTO, UX Researcher, and Growth Marketer — each providing an independent perspective. It then generates a consensus summary highlighting agreements, disagreements, and blind spots. It's designed to simulate the kind of cross-functional feedback you'd get from a real product review meeting.",
  },
] as const;

export const faqPageJsonLd: WithContext<FAQPage> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question" as const,
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer" as const,
      text: item.answer,
    },
  })),
};

export function createBreadcrumbJsonLd(
  items: { name: string; url: string }[],
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export const homeBreadcrumbJsonLd = createBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
]);

