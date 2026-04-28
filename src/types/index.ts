import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export interface ProjectWithCounts {
  id: string;
  name: string;
  description: string | null;
  targetUsers: string | null;
  market: string | null;
  businessModel: string | null;
  goals: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    decisions: number;
    features: number;
    messages: number;
    documents: number;
    insights: number;
  };
}
