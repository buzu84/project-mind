/**
 * Mock roadmap generator for development without OpenAI API key.
 * Returns the same GeneratedRoadmap shape as the real AI, but uses
 * actual project data to produce realistic-looking output.
 */

interface RoadmapItem {
  title: string;
  description: string;
  priority?: "critical" | "high" | "medium" | "low";
  confidence?: "high" | "medium" | "low";
}

interface GeneratedRoadmap {
  title: string;
  now: RoadmapItem[];
  next: RoadmapItem[];
  later: RoadmapItem[];
  plan_30_days: RoadmapItem[];
  plan_60_days: RoadmapItem[];
  plan_90_days: RoadmapItem[];
  risks: RoadmapItem[];
  dependencies: RoadmapItem[];
  success_metrics: RoadmapItem[];
}

interface MockRoadmapInput {
  projectName: string;
  description?: string | null;
  targetUsers?: string | null;
  market?: string | null;
  businessModel?: string | null;
  goals?: string | null;
}

export async function generateMockRoadmap(
  input: MockRoadmapInput,
): Promise<GeneratedRoadmap> {
  // Simulate network delay so loading state is visible
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const name = input.projectName || "Product";
  const users = input.targetUsers || "target users";
  const market = input.market || "the market";

  return {
    title: `${name} — Strategic Roadmap`,

    now: [
      {
        title: `Define ${name} core value proposition`,
        description: `Articulate the unique value ${name} delivers to ${users}. Ensure every team member can explain it in one sentence.`,
        priority: "critical",
        confidence: "high",
      },
      {
        title: "Set up analytics and tracking",
        description: `Implement event tracking for key user flows so we can measure engagement from day one. Focus on activation and retention events.`,
        priority: "critical",
        confidence: "high",
      },
      {
        title: `Build MVP onboarding flow`,
        description: `Create a streamlined onboarding experience for ${users}. Target < 2 minutes to first value moment.`,
        priority: "high",
        confidence: "medium",
      },
      {
        title: "Establish feedback collection loop",
        description: `Set up systematic feedback collection from early ${users} — in-app surveys, interview scheduling, and a shared insights repository.`,
        priority: "high",
        confidence: "high",
      },
    ],

    next: [
      {
        title: `Launch ${name} beta to early adopters`,
        description: `Release ${name} to a curated group of 20-50 ${users} for validation. Collect qualitative and quantitative feedback.`,
        priority: "high",
        confidence: "medium",
      },
      {
        title: "Iterate on core features based on feedback",
        description: `Prioritize the top 3 feature requests from beta users. Ship improvements in 1-week cycles.`,
        priority: "high",
        confidence: "medium",
      },
      {
        title: `Competitive positioning in ${market}`,
        description: `Analyze top 3 competitors and identify ${name}'s defensible differentiators. Update marketing messaging accordingly.`,
        priority: "medium",
        confidence: "medium",
      },
      {
        title: "Performance and reliability hardening",
        description: "Optimize load times, add error monitoring, and ensure 99.9% uptime before scaling user base.",
        priority: "medium",
        confidence: "high",
      },
    ],

    later: [
      {
        title: `Scale ${name} acquisition channels`,
        description: `Identify and invest in the top 2 organic growth channels for reaching ${users} in ${market}.`,
        priority: "medium",
        confidence: "low",
      },
      {
        title: "Build integrations ecosystem",
        description: `Develop API and integrations with tools ${users} already use daily. Start with the top 3 most-requested integrations.`,
        priority: "medium",
        confidence: "low",
      },
      {
        title: `Explore ${input.businessModel || "monetization"} optimization`,
        description: `A/B test pricing tiers and packaging to maximize conversion and revenue per user.`,
        priority: "low",
        confidence: "low",
      },
      {
        title: "Team expansion planning",
        description: `Define hiring roadmap based on growth trajectory. Prioritize roles that unlock the next phase of product development.`,
        priority: "low",
        confidence: "low",
      },
    ],

    plan_30_days: [
      {
        title: "Week 1-2: Foundation sprint",
        description: `Complete core feature set for ${name}. Set up CI/CD, monitoring, and staging environment.`,
        priority: "critical",
        confidence: "high",
      },
      {
        title: "Week 2-3: Internal testing",
        description: "Run internal dogfooding sessions. Fix critical bugs and UX friction points identified by the team.",
        priority: "high",
        confidence: "high",
      },
      {
        title: "Week 3-4: Beta launch prep",
        description: `Prepare beta landing page, onboarding emails, and feedback forms. Recruit 20+ ${users} for beta.`,
        priority: "high",
        confidence: "medium",
      },
    ],

    plan_60_days: [
      {
        title: "Beta feedback synthesis",
        description: `Analyze all beta feedback. Identify top 5 pain points and top 5 loved features. Create action plan.`,
        priority: "high",
        confidence: "medium",
      },
      {
        title: "V1 feature completion",
        description: `Ship the features needed to move from beta to public launch. Focus on reliability and polish.`,
        priority: "high",
        confidence: "medium",
      },
      {
        title: "Go-to-market strategy finalization",
        description: `Finalize positioning, pricing, and launch channels for ${name} in ${market}.`,
        priority: "medium",
        confidence: "medium",
      },
    ],

    plan_90_days: [
      {
        title: `Public launch of ${name}`,
        description: `Launch ${name} publicly. Execute coordinated launch across Product Hunt, social media, and direct outreach to ${users}.`,
        priority: "critical",
        confidence: "medium",
      },
      {
        title: "Post-launch optimization",
        description: "Monitor activation, retention, and conversion funnels. Run experiments to improve each by 10%+.",
        priority: "high",
        confidence: "medium",
      },
      {
        title: "Q2 roadmap planning",
        description: `Based on 90 days of data, define the next quarter's priorities. Align product, engineering, and business goals.`,
        priority: "medium",
        confidence: "low",
      },
    ],

    risks: [
      {
        title: "Slow user adoption",
        description: `${users} may not see immediate value if onboarding is too complex or the core use case isn't clear enough.`,
        priority: "high",
      },
      {
        title: "Technical scalability gaps",
        description: "Architecture may not handle 10x growth without re-engineering. Identify bottlenecks before scaling.",
        priority: "medium",
      },
      {
        title: `Competitive pressure in ${market}`,
        description: `Established players may ship similar features. Speed of execution and user relationships are key defenses.`,
        priority: "medium",
      },
    ],

    dependencies: [
      {
        title: "Analytics infrastructure",
        description: "Event tracking and dashboards must be in place before beta launch to measure impact of changes.",
      },
      {
        title: "Feedback pipeline",
        description: `Structured way to collect, tag, and prioritize feedback from ${users}. Needed before scaling beyond beta.`,
      },
      {
        title: "Design system and component library",
        description: "Consistent UI components are needed to ship new features quickly without design debt.",
      },
    ],

    success_metrics: [
      {
        title: "Activation rate > 40%",
        description: `Percentage of new ${users} who complete onboarding and perform the key action within first session.`,
      },
      {
        title: "Week-1 retention > 30%",
        description: "Percentage of users who return within 7 days of first use. Indicates product-market fit signal.",
      },
      {
        title: "NPS > 40",
        description: `Net Promoter Score from ${users} surveyed after 2+ weeks of usage.`,
      },
      {
        title: "Beta → paid conversion > 5%",
        description: `Percentage of beta ${users} who convert to paid plan within 30 days of public launch.`,
      },
    ],
  };
}

