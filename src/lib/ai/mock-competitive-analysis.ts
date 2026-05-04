/**
 * Mock Competitive Analysis generator for development without OpenAI API key.
 */

export function generateMockCompetitiveAnalysis({
  productName,
  industry,
  competitors,
}: {
  productName: string;
  industry: string;
  competitors?: string;
}): string {
  const knownCompetitors = competitors
    ? competitors.split(",").map((c) => c.trim()).filter(Boolean)
    : ["Competitor A", "Competitor B", "Competitor C"];

  const comp1 = knownCompetitors[0] ?? "Competitor A";
  const comp2 = knownCompetitors[1] ?? "Competitor B";
  const comp3 = knownCompetitors[2] ?? "Competitor C";

  return `# Competitive Analysis: ${productName}

## Market Overview

The ${industry} market is growing rapidly, driven by digital transformation, increased remote work adoption, and the demand for streamlined workflows. The total addressable market (TAM) is estimated at $15–25B with a compound annual growth rate of 12–18%.

Key market trends:
- Consolidation of point solutions into platforms
- AI-powered automation becoming table stakes
- Self-serve and product-led growth dominating GTM strategies
- Increased focus on data privacy and compliance

## Competitor Profiles

### ${comp1}
- **Founded**: 2015
- **Funding**: $120M Series C
- **Positioning**: Enterprise-grade solution for large teams
- **Strengths**: Brand recognition, feature depth, integrations ecosystem
- **Weaknesses**: Complex onboarding, high price point, slow innovation cycle

### ${comp2}
- **Founded**: 2018
- **Funding**: $45M Series B
- **Positioning**: Mid-market focused with emphasis on UX
- **Strengths**: Clean design, fast setup, strong customer support
- **Weaknesses**: Limited enterprise features, smaller integration ecosystem

### ${comp3}
- **Founded**: 2020
- **Funding**: $15M Series A
- **Positioning**: AI-first challenger targeting startups and SMBs
- **Strengths**: Modern tech stack, competitive pricing, rapid iteration
- **Weaknesses**: Limited track record, small team, feature gaps

## Feature Comparison Matrix

| Feature | ${productName} | ${comp1} | ${comp2} | ${comp3} |
|---------|---------------|----------|----------|----------|
| Core workflow | ✅ | ✅ | ✅ | ✅ |
| AI automation | ✅ | ⚠️ Limited | ❌ | ✅ |
| Team collaboration | ✅ | ✅ | ✅ | ⚠️ Basic |
| API / Integrations | ⚠️ Building | ✅ | ⚠️ Limited | ⚠️ Limited |
| Self-serve onboarding | ✅ | ❌ | ✅ | ✅ |
| Enterprise SSO | 🔜 Planned | ✅ | ✅ | ❌ |
| Mobile app | 🔜 Planned | ✅ | ✅ | ❌ |
| Analytics dashboard | ✅ | ✅ | ⚠️ Basic | ⚠️ Basic |

## SWOT Analysis

### Strengths
- Modern, AI-native architecture
- Clean user experience designed for speed
- Competitive pricing for the target segment
- Fast development and iteration cycle

### Weaknesses
- Early stage with limited brand recognition
- Smaller feature set compared to incumbents
- No established enterprise sales motion
- Limited integration ecosystem

### Opportunities
- Growing demand for AI-powered ${industry} tools
- Incumbents are slow to adopt modern AI capabilities
- Product-led growth can reduce CAC significantly
- Potential for vertical-specific positioning

### Threats
- Well-funded competitors could copy AI features quickly
- Market saturation in the broader ${industry} space
- Enterprise buyers prefer established vendors
- Economic downturn could reduce software budgets

## Strategic Recommendations

1. **Double down on AI differentiation** — Make AI capabilities the core value proposition, not a feature add-on.
2. **Target underserved segments** — Focus on SMBs and startups where ${comp1} is overpriced and over-complex.
3. **Build integration partnerships** — Prioritize integrations with the top 5 tools your target users already use.
4. **Invest in content and community** — Build thought leadership in ${industry} to drive organic acquisition.
5. **Consider vertical focus** — A niche positioning may outperform horizontal competition initially.

## Positioning Map

\`\`\`
High Price
    │
    │    ┌─────────┐
    │    │ ${comp1.slice(0, 8).padEnd(8)} │
    │    └─────────┘
    │                    ┌─────────┐
    │                    │ ${comp2.slice(0, 8).padEnd(8)} │
    │                    └─────────┘
    │
    │         ┌──────────────┐
    │         │ ${productName.slice(0, 12).padEnd(12)} │  ← Target position
    │         └──────────────┘
    │
    │    ┌─────────┐
    │    │ ${comp3.slice(0, 8).padEnd(8)} │
    │    └─────────┘
Low Price
    └──────────────────────────────
  Low Simplicity              High Simplicity
\`\`\`

---

*This competitive analysis was generated in mock mode for development purposes.*
*Generated for: ${productName} in ${industry}*`;
}

