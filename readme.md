# ProductMind

AI-powered product decision assistant for product managers, founders, and software teams.

## Features

- **PRD Generator** – Generate comprehensive product requirement documents from a simple description
- **Feature Prioritizer** – Score and rank features using the RICE framework with AI
- **Competitive Analysis** – Get instant competitive landscape analysis and positioning insights
- **AI Chat** – Streaming chat with project-aware AI strategist
- **Project Management** – Organize decisions by project with full history

## Tech Stack

- Next.js 14 (App Router)
- React 18 + TypeScript (strict)
- Tailwind CSS 3
- Supabase (Auth, Postgres, RLS, pgvector)
- OpenAI GPT-4o
- Vercel deployment

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- OpenAI API key

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.local.example .env.local

# Run SQL migrations in Supabase Dashboard → SQL Editor:
#   1. supabase/migrations/001_schema.sql
#   2. supabase/migrations/002_rls.sql

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `OPENAI_API_KEY` | OpenAI API key |
| `NEXT_PUBLIC_SITE_URL` | App URL (http://localhost:3000) |

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_schema.sql`
3. Then run `supabase/migrations/002_rls.sql`
4. Enable **Google** provider in Authentication → Providers
5. Copy your project URL and anon key to `.env.local`

## Project Structure

```
src/
├── app/
│   ├── (auth)/sign-in/          # Sign-in page
│   ├── (auth)/sign-up/          # Sign-up page
│   ├── (dashboard)/             # Protected dashboard layout
│   │   ├── dashboard/           # Dashboard homepage
│   │   ├── projects/            # Projects CRUD + AI tools
│   │   ├── ai-chat/             # Global AI assistant
│   │   └── settings/            # User settings
│   ├── api/ai/                  # AI API routes (chat, prd, prioritize, analysis)
│   ├── auth/callback/           # Supabase OAuth callback
│   └── page.tsx                 # Marketing landing page
├── components/ui/               # Reusable UI components
├── lib/
│   ├── supabase/                # Supabase clients (server, browser, middleware, types)
│   ├── openai.ts                # OpenAI client
│   └── utils.ts                 # Utility functions
├── services/                    # Data access layer
├── middleware.ts                 # Auth session refresh + route protection
└── types/                       # TypeScript types
supabase/
└── migrations/                  # SQL schema + RLS policies
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
