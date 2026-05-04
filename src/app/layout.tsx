import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { validateEnv } from "@/lib/env";
import "./globals.css";

// Validate env vars at startup (runs once on server)
validateEnv();

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProductMind – AI Product Decision Assistant",
  description:
    "AI-powered product decision assistant for product managers, founders and software teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
