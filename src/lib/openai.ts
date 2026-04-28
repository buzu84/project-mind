import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content ?? "";
}

