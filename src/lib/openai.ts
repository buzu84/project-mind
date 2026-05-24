import OpenAI from "openai";

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

  return {
    content: response.choices[0]?.message?.content ?? "",
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    model,
  };
}

