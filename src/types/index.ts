import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export interface ProjectWithCounts {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    decisions: number;
    features: number;
  };
}

