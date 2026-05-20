import Link from "next/link";

const workflowSteps = [
  {
    step: "01",
    title: "Create a project",
    description:
      "Start by creating a project. This sets up the foundation that all AI tools reference. Keep descriptions specific — vague inputs produce vague outputs.",
    where: "Go to Projects → click \"New Project\" → fill in the form.",
    fields: [
      { name: "Project Name", why: "Identifies your product across all tools and outputs." },
      { name: "Market / Industry", why: "Grounds competitive analysis and positioning in the right market." },
      { name: "Description", why: "Gives AI a baseline understanding of what the product does. At least 1–2 sentences." },
      { name: "Target Users", why: "Shapes user stories, persona analysis, and feature prioritization." },
      { name: "Business Model", why: "Informs revenue-related recommendations and competitive positioning." },
      { name: "Goals", why: "Used as alignment criteria for roadmap prioritization and PRD success metrics." },
    ],
  },
  {
    step: "02",
    title: "Enrich with Context Builder",
    description:
      "Open your project and use Context Builder to add structured details across 8 sections. Each section feeds directly into AI tools — the more you fill in, the more grounded every output will be. A progress bar tracks how complete your context is.",
    where: "Project page → \"Context Builder\" card.",
    contextSections: [
      "Product Overview",
      "Target Personas",
      "Current Metrics",
      "Customer Pain Points",
      "Competitors",
      "Strategic Goals",
      "Constraints",
      "Open Questions",
    ],
  },
  {
    step: "03",
    title: "Upload evidence & research",
    description:
      "Use Feedback & Research to add qualitative evidence — interviews, survey results, support tickets, or strategy notes. Documents are indexed and automatically retrieved by AI tools when relevant to a generation task. This is how you ground AI outputs in real user data instead of assumptions.",
    where: "Project page → \"Feedback & Research\" card.",
    examples: [
      "User interview transcripts",
      "Customer feedback or NPS comments",
      "Support ticket summaries",
      "Survey results",
      "Meeting notes or strategy docs",
      "Competitor research notes",
    ],
    tip: "A single detailed user interview is more useful than a generic market report. Quality over quantity.",
  },
  {
    step: "04",
    title: "Use AI tools",
    description:
      "With context and evidence in place, each AI tool draws on your project data to produce structured outputs you can review, regenerate, and use as starting points. You can run tools in any order, but the recommended flow is: PRD Generator → Feature Prioritizer → AI Roadmap → Decisions.",
    where: "Project page → tool cards (PRD Generator, Feature Prioritizer, AI Roadmap, etc.).",
  },
];

const tools = [
  {
    name: "PRD Generator",
    does: "Creates a structured Product Requirements Document from your project context.",
    bestInputs: "Detailed project description, target users, goals, and constraints.",
    outputs: "Executive summary, problem statement, user stories, success metrics, functional requirements, technical considerations.",
    bestFor: "Kickstarting a new feature or product spec for stakeholder review.",
  },
  {
    name: "Feature Prioritizer",
    does: "Scores features using RICE (Reach, Impact, Confidence, Effort) and ICE frameworks.",
    bestInputs: "A list of 3+ feature ideas with brief descriptions. Project goals for alignment context.",
    outputs: "Scored feature table with RICE/ICE rankings, AI commentary per feature, sortable by priority.",
    bestFor: "Deciding what to build next when you have competing feature ideas.",
  },
  {
    name: "AI Roadmap",
    does: "Generates a prioritized roadmap with Now/Next/Later buckets and a 30/60/90-day plan.",
    bestInputs: "Project context, scored features, goals, and constraints.",
    outputs: "Prioritized timeline, risk assessment, dependency mapping, success metrics per phase.",
    bestFor: "Communicating a structured plan to stakeholders or the team.",
  },
  {
    name: "Competitive Analysis",
    does: "Generates a structured competitive landscape analysis for your product.",
    bestInputs: "Product description, target market, any competitor notes you've uploaded.",
    outputs: "Competitor profiles, feature comparison, positioning gaps, market opportunities.",
    bestFor: "Understanding where your product fits in the market and identifying differentiation opportunities.",
  },
  {
    name: "AI Insights",
    does: "Generates strategic risks, opportunities, recommended next actions, and roadmap suggestions.",
    bestInputs: "Rich project context and uploaded evidence. Works best after other tools have run.",
    outputs: "Categorized insight cards: key risks, opportunities, next actions, and roadmap suggestions.",
    bestFor: "Getting a strategic overview of your product's current position and blind spots.",
  },
  {
    name: "Decisions",
    does: "Analyzes a product decision using structured reasoning and retrieved project evidence.",
    bestInputs: "A clearly stated decision or question. Relevant feedback documents uploaded to the project.",
    outputs: "Options with pros/cons, assumptions, retrieved evidence, risks, and a confidence-scored recommendation.",
    bestFor: "Making high-stakes product decisions with evidence-based reasoning instead of gut feeling.",
  },
  {
    name: "Multi-Agent Review",
    does: "Runs your project through four AI personas — Product Manager, CTO, UX Researcher, and Growth Marketer — then generates a consensus summary.",
    bestInputs: "Rich project context including goals, constraints, and target users.",
    outputs: "Four independent perspective evaluations plus a consensus highlighting agreements, disagreements, and blind spots.",
    bestFor: "Getting cross-functional feedback when you don't have a full team to review with.",
  },
  {
    name: "AI Chat (per project)",
    does: "A per-project chat assistant that answers questions using your uploaded evidence and project context.",
    bestInputs: "Specific questions about your product, feedback, or strategy. Works best with uploaded documents.",
    outputs: "Context-aware conversational responses grounded in your project data.",
    bestFor: "Quick questions, exploring feedback themes, brainstorming within project context.",
  },
  {
    name: "AI Assistant (global)",
    does: "A general-purpose product management chat available from the sidebar. It does not have access to any specific project's data or uploaded evidence.",
    bestInputs: "General product strategy questions, framework explanations, best practices.",
    outputs: "General conversational responses based on product management knowledge.",
    bestFor: "Generic questions that aren't tied to a specific project. For project-grounded answers, use the per-project AI Chat instead.",
  },
];

const bestPractices = [
  { do: "Provide specific, measurable product goals", why: "\"Increase retention by 15%\" produces better outputs than \"grow the product.\"" },
  { do: "Upload real user feedback", why: "Even a few interview quotes dramatically improve decision review and PRD quality." },
  { do: "Include constraints and tradeoffs", why: "Prevents the AI from recommending things you can't build." },
  { do: "Add competitor context", why: "Improves competitive analysis and positioning recommendations." },
  { do: "Keep project context updated", why: "As your product evolves, update goals and constraints so outputs stay relevant." },
  { do: "Review all AI outputs before acting on them", why: "AI outputs are starting points — not final decisions. Human judgment is always required." },
];

const commonMistakes = [
  { mistake: "Creating a project with no description or goals", impact: "AI outputs will be generic and unhelpful." },
  { mistake: "Uploading irrelevant or off-topic documents", impact: "RAG retrieval may inject unrelated context into outputs." },
  { mistake: "Writing vague feature requests like \"make it better\"", impact: "RICE/ICE scoring can't evaluate features without clear scope." },
  { mistake: "Treating AI outputs as final decisions", impact: "All generated content requires human review, domain expertise, and validation." },
  { mistake: "Running Decision Review without any uploaded evidence", impact: "The review will work but won't be grounded in your actual user data." },
];

export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      {/* Hero */}
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Getting Started
        </h1>
        <p className="mt-2 text-base text-gray-600">
          ProductMind works best when AI has rich project context.
          Better context produces better PRDs, roadmaps, decisions, and analysis.
        </p>
        <p className="mt-1 text-sm font-medium text-brand-600">
          Context in, structured decisions out.
        </p>
      </section>

      {/* Recommended Workflow */}
      <section>
        <h2 className="text-xl font-bold text-gray-900">Recommended workflow</h2>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Follow these steps to get the most out of every AI tool.
        </p>
        <div className="space-y-6">
          {workflowSteps.map((s) => (
            <div
              key={s.step}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-bold text-brand-600">
                  Step {s.step}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {s.title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {s.description}
              </p>
              {s.where && (
                <p className="mt-2 text-xs text-brand-600">
                  <span className="font-semibold">Where:</span> {s.where}
                </p>
              )}

              {s.contextSections && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Context Builder sections
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {s.contextSections.map((cs) => (
                      <div
                        key={cs}
                        className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                      >
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                        {cs}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {s.fields && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    What to fill in and why
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {s.fields.map((f) => (
                      <div
                        key={f.name}
                        className="rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {f.name}
                        </p>
                        <p className="text-xs text-gray-500">{f.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {s.examples && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Good evidence to upload
                  </p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {s.examples.map((ex) => (
                      <li
                        key={ex}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                  {s.tip && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <strong>Tip:</strong> {s.tip}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* What each tool does */}
      <section>
        <h2 className="text-xl font-bold text-gray-900">What each tool does</h2>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Inputs that improve results, outputs you&apos;ll receive, and when to use each tool.
        </p>
        <div className="space-y-4">
          {tools.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <h3 className="text-base font-semibold text-gray-900">
                {t.name}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{t.does}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-blue-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase text-blue-600">
                    Best inputs
                  </p>
                  <p className="mt-0.5 text-xs text-blue-900">{t.bestInputs}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase text-emerald-600">
                    What you&apos;ll get
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-900">
                    {t.outputs}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase text-purple-600">
                    Best for
                  </p>
                  <p className="mt-0.5 text-xs text-purple-900">{t.bestFor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to get the best results */}
      <section>
        <h2 className="text-xl font-bold text-gray-900">
          How to get the best results
        </h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          Practical guidance for higher-quality AI outputs.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {bestPractices.map((bp) => (
            <div
              key={bp.do}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <p className="text-sm font-medium text-gray-900">✓ {bp.do}</p>
              <p className="mt-0.5 text-xs text-gray-500">{bp.why}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example high-quality project context */}
      <section>
        <h2 className="text-xl font-bold text-gray-900">
          Example: high-quality project context
        </h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          A realistic example of project context that produces strong AI outputs.
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm leading-relaxed text-gray-700">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-gray-900">Product</p>
              <p>SmartMenu — AI-powered restaurant menu recommendation engine</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Target users</p>
              <p>Restaurant owners (setup & analytics), diners (in-venue ordering via QR code)</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Business goal</p>
              <p>Increase average order value by 12% through personalized menu suggestions within 6 months of launch.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Problem statement</p>
              <p>Diners spend 40% of their visit time choosing from large menus. 25% report decision fatigue that reduces satisfaction and upsell potential.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Constraints</p>
              <p>Must support allergen filtering (EU regulation). Initial launch limited to 50 partner restaurants. No native app — web-only via QR code.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Success metrics</p>
              <p>Average order value, time-to-order, diner satisfaction score, restaurant churn rate.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Common mistakes */}
      <section>
        <h2 className="text-xl font-bold text-gray-900">Common mistakes</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          Patterns that reduce AI output quality.
        </p>
        <div className="space-y-2">
          {commonMistakes.map((m) => (
            <div
              key={m.mistake}
              className="flex gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3"
            >
              <span className="mt-0.5 text-red-400">✗</span>
              <div>
                <p className="text-sm font-medium text-red-900">
                  {m.mistake}
                </p>
                <p className="text-xs text-red-700">{m.impact}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
        <h2 className="text-lg font-bold text-brand-900">Ready to start?</h2>
        <p className="mt-1 text-sm text-brand-700">
          Create your first project and give the AI something to work with.
        </p>
        <Link
          href="/projects"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition"
        >
          Go to Projects
        </Link>
      </section>
    </div>
  );
}

