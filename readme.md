# ProductMind

AI-powered product decision assistant for product managers, founders, and software teams.

## Features

- **PRD Generator** – Generate comprehensive product requirement documents from a simple description
- **Feature Prioritizer** – Score and rank features using the RICE framework with AI
- **Competitive Analysis** – Get instant competitive landscape analysis and positioning insights
- **Project Management** – Organize decisions by project with full history

## Tech Stack

- Next.js 14 (App Router)
- React 18 + TypeScript (strict)
- Tailwind CSS 3
- Prisma + PostgreSQL
- NextAuth (GitHub & Google)
- OpenAI GPT-4o

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- GitHub/Google OAuth credentials

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.local.example .env.local

# Push schema to database
npm run db:push

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | Random secret for session encryption |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth app credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `OPENAI_API_KEY` | OpenAI API key |

## Project Structure

```
src/
├── app/
│   ├── (auth)/sign-in/        # Auth pages
│   ├── (dashboard)/projects/  # Dashboard & project pages
│   ├── api/ai/                # AI API routes (prd, prioritize, competitive-analysis)
│   └── api/auth/              # NextAuth route
├── components/ui/             # Reusable UI components
├── lib/                       # Shared utilities (prisma, auth, openai)
├── types/                     # TypeScript type declarations
└── middleware.ts              # Auth middleware
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

