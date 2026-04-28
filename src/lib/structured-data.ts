import type { WithContext, SoftwareApplication, Organization, FAQPage, BreadcrumbList } from "schema-dts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://productmind.app";

export const organizationJsonLd: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ProductMind",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "AI-powered product decision assistant for product managers, founders, and software teams.",
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
    "AI-powered product decision assistant that helps teams generate PRDs, prioritize features, and analyze competition.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan with 10 AI decisions per month",
  },
  featureList: [
    "AI-powered PRD generation",
    "Feature prioritization with RICE framework",
    "Competitive landscape analysis",
    "Project management dashboard",
  ],
  screenshot: `${SITE_URL}/screenshot.png`,
  author: organizationJsonLd,
};

export const faqItems = [
  {
    question: "What is ProductMind?",
    answer:
      "ProductMind is an AI-powered product decision assistant that helps product managers, founders, and software teams make better product decisions. It can generate PRDs, prioritize features using the RICE framework, and provide competitive analysis.",
  },
  {
    question: "How does the PRD Generator work?",
    answer:
      "The PRD Generator takes your product idea description and uses AI to create a comprehensive Product Requirements Document. It includes sections like Executive Summary, Problem Statement, Goals & Success Metrics, User Stories, Functional Requirements, and more.",
  },
  {
    question: "What is the RICE framework for feature prioritization?",
    answer:
      "RICE stands for Reach, Impact, Confidence, and Effort. ProductMind uses AI to score each of your features across these four dimensions, then calculates a priority score to help you decide what to build next.",
  },
  {
    question: "Is ProductMind free to use?",
    answer:
      "ProductMind offers a free plan that includes 10 AI-powered decisions per month. This covers PRD generation, feature prioritization, and competitive analysis.",
  },
  {
    question: "What AI model does ProductMind use?",
    answer:
      "ProductMind uses OpenAI's GPT-4o model to power its AI features, ensuring high-quality, contextual product insights and recommendations.",
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

