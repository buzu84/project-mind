/**
 * Mock insights generator for development without OpenAI API key.
 */

interface MockInsight {
  title: string;
  type: string;
  explanation: string;
  priority: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  suggested_action: string;
}

export function generateMockInsights({
  projectName,
  targetUsers,
  market,
}: {
  projectName: string;
  targetUsers?: string | null;
  market?: string | null;
}): MockInsight[] {
  const audience = targetUsers || "users";
  const mkt = market || "the market";

  return [
    {
      title: `${projectName} has strong product-market fit potential`,
      type: "opportunity",
      explanation: `Based on the project context, ${projectName} addresses a clear need for ${audience}. The timing and positioning suggest an opportunity to capture early adopters.`,
      priority: "high",
      confidence: "medium",
      suggested_action: `Validate with 5-10 ${audience} through structured interviews before committing to the full roadmap.`,
    },
    {
      title: "Competitive differentiation needs strengthening",
      type: "strategic_gap",
      explanation: `In ${mkt}, differentiation is key. The current feature set may overlap with existing solutions. A unique value proposition should be clearly articulated.`,
      priority: "high",
      confidence: "medium",
      suggested_action: "Conduct a competitive analysis and identify 2-3 unique differentiators.",
    },
    {
      title: "User onboarding is a critical success factor",
      type: "risk",
      explanation: `First-time experience will make or break retention for ${audience}. If onboarding takes more than 2 minutes, drop-off rates will be high.`,
      priority: "critical",
      confidence: "high",
      suggested_action: "Design a guided onboarding flow with time-to-value under 2 minutes.",
    },
    {
      title: "Consider a freemium model for growth",
      type: "opportunity",
      explanation: `A free tier could accelerate adoption among ${audience} while a paid tier captures enterprise value. This model is proven in ${mkt}.`,
      priority: "medium",
      confidence: "medium",
      suggested_action: "Define free vs. paid feature boundaries and model unit economics.",
    },
    {
      title: "Technical scalability needs early planning",
      type: "risk",
      explanation: "If adoption grows faster than expected, technical debt from rapid MVP development could become a bottleneck. Architecture decisions made now will have long-term impact.",
      priority: "medium",
      confidence: "high",
      suggested_action: "Allocate 20% of sprint capacity for technical debt reduction from sprint 3 onward.",
    },
    {
      title: "Collect user feedback from day one",
      type: "next_action",
      explanation: `Setting up feedback collection early ensures you can iterate based on real ${audience} needs rather than assumptions.`,
      priority: "high",
      confidence: "high",
      suggested_action: "Integrate an in-app feedback widget and schedule bi-weekly user interviews.",
    },
    {
      title: "Product metrics framework is missing",
      type: "assumption",
      explanation: "Without defined KPIs and tracking, it will be difficult to measure whether the product is succeeding. Many teams assume they know what to measure but miss critical metrics.",
      priority: "medium",
      confidence: "high",
      suggested_action: "Define North Star metric plus 3-5 supporting metrics before launch.",
    },
    {
      title: "Mobile experience should be prioritized",
      type: "pain_point",
      explanation: `Many ${audience} will access ${projectName} on mobile devices. A poor mobile experience is a common pain point in ${mkt}.`,
      priority: "medium",
      confidence: "medium",
      suggested_action: "Ensure responsive design for core workflows; consider mobile-first for key features.",
    },
    {
      title: "Plan a phased roadmap with clear milestones",
      type: "roadmap",
      explanation: `A phased approach reduces risk and allows for learning. Ship the smallest valuable version of ${projectName} first, then iterate.`,
      priority: "high",
      confidence: "high",
      suggested_action: "Use the Roadmap Generator to create a Now/Next/Later roadmap with 30/60/90-day milestones.",
    },
  ];
}

