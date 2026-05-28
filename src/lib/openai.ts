import OpenAI from "openai";
import { stripMarkdownFence } from "@/lib/export/copy-markdown";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export async function generateCompletionWithUsage(
  systemPrompt: string,
  userPrompt: string,
): Promise<{
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}> {
  const model = "gpt-4o";
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const raw = response.choices[0]?.message?.content ?? "";

  return {
    // Strip outer ```markdown wrappers that models sometimes add.
    // Cleaned before DB persistence so stored content is always clean.
    content: stripMarkdownFence(raw),
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    model,
  };
}

