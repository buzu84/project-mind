/**
 * Mock feature scoring for development without OpenAI.
 * Produces deterministic but varied scores based on feature content.
 */

interface MockFeatureInput {
  name: string;
  description: string | null;
}

interface MockFeatureScore {
  name: string;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  rice_score: number;
  ice_score: number;
  ai_commentary: string;
}

/** Simple deterministic hash from a string → number 0–1 */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 1000) / 1000;
}

function pick(seed: number, min: number, max: number): number {
  return Math.round(min + seed * (max - min));
}

export function generateMockFeatureScores(
  features: MockFeatureInput[],
  projectName?: string,
): MockFeatureScore[] {
  return features.map((f) => {
    const seed = hash(f.name + (f.description ?? "") + (projectName ?? ""));
    const descLen = (f.description ?? "").length;

    const reach = pick(seed, 3, 9);
    const impact = pick(hash(f.name + "i"), 3, 9);
    const confidence = descLen > 60 ? pick(hash(f.name + "c"), 5, 9) : pick(hash(f.name + "c"), 3, 6);
    const effort = pick(hash(f.name + "e"), 2, 8);
    const rice_score = Math.round(((reach * impact * confidence) / effort) * 100) / 100;
    const ease = 11 - effort;
    const ice_score = Math.round((impact * confidence * ease) * 100) / 100;

    const ai_commentary = [
      `Reach (${reach}/10): "${f.name}" could affect a moderate-to-large portion of the user base based on its scope.`,
      `Impact (${impact}/10): This feature addresses a ${impact >= 7 ? "critical" : impact >= 4 ? "meaningful" : "minor"} user need.`,
      `Confidence (${confidence}/10): ${confidence >= 7 ? "Good supporting evidence from description detail." : "Limited detail reduces certainty."}`,
      `Effort (${effort}/10): Estimated ${effort <= 3 ? "low" : effort <= 6 ? "moderate" : "significant"} engineering and design work.`,
      `Overall: RICE ${rice_score} | ICE ${ice_score} — ${rice_score > 30 ? "High priority candidate." : rice_score > 15 ? "Worth considering for next cycle." : "Lower priority relative to alternatives."}`,
    ].join("\n");

    return { name: f.name, reach, impact, confidence, effort, rice_score, ice_score, ai_commentary };
  });
}

