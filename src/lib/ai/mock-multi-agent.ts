/**
 * Mock multi-agent review generator for development without OpenAI.
 * Uses real project data to produce realistic persona responses.
 */
import type { AgentResponse, ConsensusResponse, InputType } from "./multi-agent-types";

interface MockInput {
  question: string;
  inputType: InputType;
  projectName: string;
  targetUsers?: string | null;
  market?: string | null;
}

interface MockResult {
  pm: AgentResponse;
  cto: AgentResponse;
  ux: AgentResponse;
  growth: AgentResponse;
  consensus: ConsensusResponse;
}

export async function generateMockMultiAgentReview(input: MockInput): Promise<MockResult> {
  await new Promise((r) => setTimeout(r, 1500));

  const { question, projectName, targetUsers, market } = input;
  const users = targetUsers || "users";
  const mkt = market || "the market";
  const q = question.length > 60 ? question.slice(0, 60) + "..." : question;

  const pm: AgentResponse = {
    summary: `From a product perspective, "${q}" aligns with ${projectName}'s goal of delivering value to ${users}. This deserves prioritization if user research validates the demand.`,
    key_points: [
      `Addresses a real need expressed by ${users}`,
      `Fits within ${projectName}'s current product vision`,
      "Could improve activation and retention metrics",
      "Manageable scope for a 2-3 sprint initiative",
    ],
    concerns: [
      "May compete with other high-priority items on the roadmap",
      "Need to validate with at least 10 user interviews before committing",
      `ROI needs quantification relative to ${projectName}'s current priorities`,
    ],
    recommendations: [
      "Run a discovery sprint with 5-10 user interviews",
      "Create a lightweight prototype to test core assumptions",
      "Define clear success metrics before building",
    ],
    confidence: 0.75,
  };

  const cto: AgentResponse = {
    summary: `Technically, this is feasible but requires careful architecture planning. The main risk is complexity creep if scope isn't tightly controlled.`,
    key_points: [
      "Core implementation is straightforward with existing tech stack",
      "Estimated 3-4 weeks of engineering effort for MVP",
      "No major infrastructure changes required",
      "Can leverage existing API patterns",
    ],
    concerns: [
      "Potential performance impact under load needs benchmarking",
      "Data model changes may affect existing queries",
      "Security review needed if handling sensitive user data",
      "Technical debt risk if rushed to meet deadlines",
    ],
    recommendations: [
      "Start with a technical spike to validate architecture",
      "Define API contracts before implementation",
      "Plan for incremental rollout with feature flags",
      "Allocate 20% buffer for unknown unknowns",
    ],
    confidence: 0.7,
  };

  const ux: AgentResponse = {
    summary: `This could significantly improve the experience for ${users} if implemented with proper research backing. Current assumptions about user needs should be validated.`,
    key_points: [
      `${users} have expressed frustration with related workflows`,
      "Opportunity to reduce friction in a key user journey",
      "Competitors offer partial solutions but none are comprehensive",
      "Accessibility must be considered from the start",
    ],
    concerns: [
      "Risk of adding cognitive load if UI is not well-designed",
      "Need to test with diverse user segments, not just power users",
      "Onboarding flow may need updating to accommodate this feature",
      "Information architecture could become cluttered",
    ],
    recommendations: [
      "Conduct usability testing with 5+ participants from different segments",
      "Create a user journey map before designing UI",
      "Follow progressive disclosure pattern to manage complexity",
      "A/B test the feature against current experience",
    ],
    confidence: 0.65,
  };

  const growth: AgentResponse = {
    summary: `This has potential for driving acquisition and activation in ${mkt}. The key question is whether it creates a compelling enough differentiator.`,
    key_points: [
      `Could become a unique selling point in ${mkt}`,
      "Potential for viral loop if feature includes sharing/collaboration",
      "Addresses a gap that competitors haven't fully solved",
      `Aligns with ${users}' willingness to pay for premium features`,
    ],
    concerns: [
      "Market timing — competitors may be working on similar features",
      "Messaging complexity if value prop is hard to explain in one sentence",
      "May not move the needle on acquisition without marketing investment",
    ],
    recommendations: [
      "Test positioning with a landing page experiment before building",
      "Plan a launch sequence: beta → ProductHunt → broader rollout",
      `Identify 3 ${users} segments most likely to adopt and focus there`,
      "Build sharing/referral mechanics into the feature design",
    ],
    confidence: 0.7,
  };

  const consensus: ConsensusResponse = {
    recommendation: "recommend",
    summary: `All four perspectives see merit in this initiative for ${projectName}. The Product Manager and Growth Marketer are most bullish, while the CTO and UX Researcher urge validation before full commitment. The consensus is to proceed with a structured discovery and prototyping phase.`,
    disagreements: [
      "PM sees this as a near-term priority; CTO prefers more technical validation first",
      "Growth wants to move fast for market timing; UX insists on thorough usability testing",
      "CTO estimates 3-4 weeks; PM believes scope should be cut to fit a 2-week sprint",
    ],
    risks: [
      "Scope creep if discovery reveals additional user needs",
      "Engineering capacity constraints may delay other roadmap items",
      `Competitive response in ${mkt} if we move too slowly`,
      "User adoption risk if onboarding isn't well-designed",
    ],
    next_steps: [
      "Schedule 5-10 user interviews within the next 2 weeks",
      "Run a technical spike to validate architecture (1 week)",
      "Create a lightweight prototype for usability testing",
      "Define go/no-go criteria based on research findings",
      "Present findings to stakeholders before committing to full build",
    ],
    overall_confidence: 0.7,
  };

  return { pm, cto, ux, growth, consensus };
}

