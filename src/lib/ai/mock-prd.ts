/**
 * Mock PRD generator for development without OpenAI API key.
 */

export function generateMockPrd({
  productName,
  productDescription,
  targetAudience,
}: {
  productName: string;
  productDescription: string;
  targetAudience?: string;
}): string {
  const audience = targetAudience || "target users";

  return `# Product Requirements Document: ${productName}

## Executive Summary

${productName} is a product designed to ${productDescription.slice(0, 200)}. This PRD outlines the key requirements, goals, user stories, and implementation plan.

## Problem Statement

Users currently face challenges that ${productName} aims to solve. The core problem is the lack of an efficient, user-friendly solution for the needs described above.

## Goals & Success Metrics

### Goals
- Launch MVP within 90 days
- Achieve product-market fit with ${audience}
- Deliver a delightful user experience that drives retention

### Success Metrics
| Metric | Target | Timeline |
|--------|--------|----------|
| User activation rate | > 60% | Month 1 |
| Weekly active users | 500+ | Month 3 |
| NPS score | > 40 | Month 3 |
| Churn rate | < 5% monthly | Month 6 |

## User Stories

1. **As a** ${audience}, **I want to** quickly get started with ${productName} **so that** I can see value immediately.
2. **As a** ${audience}, **I want to** accomplish my core task efficiently **so that** I save time.
3. **As a** returning user, **I want to** see my previous work **so that** I can continue where I left off.
4. **As an** admin, **I want to** manage team access **so that** I can control permissions.

## Functional Requirements

### Core Features (P0)
- User authentication and onboarding
- Primary workflow for the core use case
- Data persistence and retrieval
- Basic settings and preferences

### Important Features (P1)
- Search and filtering
- Export and sharing capabilities
- Notification system
- Mobile-responsive design

### Nice-to-Have Features (P2)
- Advanced analytics dashboard
- Third-party integrations
- Collaboration features
- Custom theming

## Non-Functional Requirements

- **Performance**: Page load < 2s, API response < 500ms
- **Security**: SOC 2 compliant, encrypted at rest and in transit
- **Scalability**: Support 10,000 concurrent users
- **Availability**: 99.9% uptime SLA
- **Accessibility**: WCAG 2.1 AA compliance

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Discovery & Design | 2 weeks | User research, wireframes, design system |
| MVP Development | 6 weeks | Core features, basic UI, auth |
| Beta Testing | 2 weeks | Bug fixes, UX improvements |
| Launch | 1 week | Production deployment, monitoring |
| Post-Launch | Ongoing | Iteration based on feedback |

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Technical complexity underestimated | High | Medium | Spike early, prototype critical paths |
| Low initial adoption | High | Medium | Pre-launch waitlist, early access program |
| Scope creep | Medium | High | Strict PRD adherence, sprint reviews |
| Third-party API dependency | Medium | Low | Abstraction layer, fallback mechanisms |

---

*This PRD was generated in mock mode for development purposes.*
*Generated for: ${productName}*`;
}

