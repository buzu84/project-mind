import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Create demo user ──────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "dev@productmind.app" },
    update: {},
    create: {
      email: "dev@productmind.app",
      name: "Demo User",
      image: null,
    },
  });
  console.log(`✅ User: ${user.name} (${user.email})`);

  // ── Create projects ───────────────────────────────────────────────
  const taskFlow = await prisma.project.create({
    data: {
      name: "TaskFlow",
      description: "AI-powered project management tool for remote teams",
      targetUsers: "Remote engineering teams (10-100 people)",
      market: "Project Management SaaS",
      businessModel: "Freemium with per-seat pricing",
      goals: "Reach 1,000 active teams within 6 months of launch",
      userId: user.id,
    },
  });

  const healthPulse = await prisma.project.create({
    data: {
      name: "HealthPulse",
      description: "Personal health tracking app with AI-driven insights",
      targetUsers: "Health-conscious adults aged 25-45",
      market: "Digital Health & Wellness",
      businessModel: "Subscription-based ($9.99/month)",
      goals: "50,000 downloads in first quarter, 20% conversion to paid",
      userId: user.id,
    },
  });

  const marketMind = await prisma.project.create({
    data: {
      name: "MarketMind",
      description: "Competitive intelligence dashboard for startups",
      targetUsers: "Startup founders and product managers",
      market: "Business Intelligence",
      businessModel: "Tiered SaaS pricing",
      goals: "Validate MVP with 50 beta users, achieve $5K MRR",
      userId: user.id,
    },
  });

  console.log(`✅ Projects: ${taskFlow.name}, ${healthPulse.name}, ${marketMind.name}`);

  // ── Features for TaskFlow ─────────────────────────────────────────
  await prisma.feature.createMany({
    data: [
      { name: "Real-time collaboration", priority: 9, effort: 8, impact: 9, projectId: taskFlow.id },
      { name: "AI task assignment", priority: 8, effort: 7, impact: 8, projectId: taskFlow.id },
      { name: "Sprint planning view", priority: 7, effort: 5, impact: 7, projectId: taskFlow.id },
      { name: "Time tracking", priority: 6, effort: 4, impact: 6, projectId: taskFlow.id },
      { name: "Slack integration", priority: 5, effort: 3, impact: 7, projectId: taskFlow.id },
    ],
  });
  console.log("✅ Features for TaskFlow");

  // ── Decisions for TaskFlow ────────────────────────────────────────
  await prisma.decision.create({
    data: {
      type: "PRD",
      input: {
        productName: "TaskFlow",
        productDescription: "AI-powered project management for remote teams",
        targetAudience: "Remote engineering teams",
      },
      output: {
        content:
          "# TaskFlow – Product Requirements Document\n\n## Executive Summary\nTaskFlow is an AI-powered project management platform designed for distributed engineering teams...\n\n## Problem Statement\nRemote teams struggle with task visibility, context switching, and asynchronous coordination...\n\n## Goals\n- Reduce time spent on task management by 40%\n- Achieve 85% daily active usage rate\n- Support teams of 10-100 members\n\n## User Stories\n1. As a team lead, I want AI to suggest task assignments based on workload and expertise\n2. As a developer, I want real-time updates without leaving my IDE\n3. As a PM, I want automated sprint reports",
      },
      projectId: taskFlow.id,
    },
  });

  await prisma.decision.create({
    data: {
      type: "PRIORITIZATION",
      input: {
        features: [
          { name: "Real-time collaboration" },
          { name: "AI task assignment" },
          { name: "Sprint planning view" },
        ],
      },
      output: {
        content:
          '```json\n[\n  {"name":"Real-time collaboration","reach":9,"impact":9,"confidence":8,"effort":8,"score":81,"rationale":"Core differentiator for remote teams"},\n  {"name":"AI task assignment","reach":7,"impact":8,"confidence":7,"effort":7,"score":56,"rationale":"High value but requires ML infrastructure"},\n  {"name":"Sprint planning view","reach":8,"impact":7,"confidence":9,"effort":5,"score":100,"rationale":"Quick win with high reach"}\n]```',
      },
      projectId: taskFlow.id,
    },
  });
  console.log("✅ Decisions for TaskFlow");

  // ── Messages for TaskFlow ─────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      {
        projectId: taskFlow.id,
        role: "system",
        content: "You are a product strategy assistant for TaskFlow, an AI-powered project management tool.",
      },
      {
        projectId: taskFlow.id,
        role: "user",
        content: "What should our launch strategy look like for the first 3 months?",
      },
      {
        projectId: taskFlow.id,
        role: "assistant",
        content:
          "Here's a suggested 3-month launch strategy for TaskFlow:\n\n**Month 1 – Private Beta**\n- Invite 20 teams from your waitlist\n- Focus on core collaboration features\n- Collect qualitative feedback weekly\n\n**Month 2 – Public Beta**\n- Open signups with a free tier\n- Launch on Product Hunt\n- Start content marketing (blog + Twitter)\n\n**Month 3 – GA Launch**\n- Introduce paid plans\n- Launch Slack integration\n- Begin outbound sales to mid-market teams",
      },
    ],
  });
  console.log("✅ Messages for TaskFlow");

  // ── Feedback Documents for HealthPulse ────────────────────────────
  await prisma.feedbackDocument.createMany({
    data: [
      {
        projectId: healthPulse.id,
        title: "Beta User Survey Results",
        content:
          "Survey of 150 beta users:\n- 82% find the daily health score useful\n- 67% want integration with Apple Health\n- 45% requested meal planning features\n- Top complaint: onboarding is too long (avg 4 minutes)\n- NPS score: 42",
        source: "Typeform Survey – March 2026",
      },
      {
        projectId: healthPulse.id,
        title: "App Store Review Analysis",
        content:
          "Analysis of 50 early reviews:\n- Average rating: 4.1/5\n- Positive themes: clean design, AI insights accuracy\n- Negative themes: battery drain, missing wearable support\n- Feature requests: sleep tracking, water intake reminders",
        source: "App Store Connect",
      },
      {
        projectId: healthPulse.id,
        title: "Competitor Feature Comparison",
        content:
          "Compared against MyFitnessPal, Noom, and Fitbit:\n- HealthPulse unique: AI-driven daily health score\n- Gap: No social/community features\n- Gap: Limited wearable integrations\n- Opportunity: B2B wellness programs",
        source: "Internal Research",
      },
    ],
  });
  console.log("✅ Feedback documents for HealthPulse");

  // ── Insights for HealthPulse ──────────────────────────────────────
  await prisma.insight.createMany({
    data: [
      {
        projectId: healthPulse.id,
        type: "user_feedback",
        title: "Users want Apple Health integration",
        content:
          "67% of surveyed beta users requested Apple Health integration. This is the most requested feature and could significantly improve retention by reducing manual data entry.",
        metadata: JSON.stringify({ source: "beta_survey", confidence: 0.85, userCount: 100 }),
      },
      {
        projectId: healthPulse.id,
        type: "market_trend",
        title: "B2B wellness market growing 23% YoY",
        content:
          "Corporate wellness programs represent a $61B market growing at 23% YoY. HealthPulse could offer team dashboards and aggregate health insights as a B2B product line.",
        metadata: JSON.stringify({ source: "market_research", confidence: 0.72 }),
      },
      {
        projectId: healthPulse.id,
        type: "product_risk",
        title: "Battery drain reported by 30% of users",
        content:
          "Excessive battery usage is the top negative feedback theme. Root cause: background location tracking for step counting. Recommend switching to motion coprocessor API.",
        metadata: JSON.stringify({ source: "app_reviews", severity: "high" }),
      },
      {
        projectId: marketMind.id,
        type: "competitive",
        title: "Crayon raised $22M Series B",
        content:
          "Competitor Crayon recently raised $22M. They focus on enterprise CI. MarketMind should differentiate by targeting SMB/startup segment with self-serve onboarding and lower pricing.",
        metadata: JSON.stringify({ source: "crunchbase", competitor: "Crayon" }),
      },
    ],
  });
  console.log("✅ Insights for HealthPulse & MarketMind");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

