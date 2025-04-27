import OpenAI from 'openai'

export async function Completions(userPrompt: string): Promise<string> {
  const endpoint = 'https://models.github.ai/inference'
  const modelName = 'openai/gpt-4o-mini'

  const modelsToken = process.env.MODELS_TOKEN || process.env.GITHUB_TOKEN

  const modelsClient = new OpenAI({ baseURL: endpoint, apiKey: modelsToken })

  const response = await modelsClient.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a summarizing bot. Given a list of timeline data, summarize the most recent changes in one sentence. 
          Keep your description brief and succinct. This will be read as part of a tabled summary of other issues, so 
          we just need to relevant details about what changed and by whom. No need to give specific dates or timestamps.
          If mentioning username/login, always format as \`@username\`, with the backticks. No need to mention the name
          or number of the issue, because that will already be known.`
      },
      { role: 'user', content: userPrompt }
    ],
    temperature: 1.0,
    top_p: 1.0,
    max_tokens: 1000,
    model: modelName
  })

  return response.choices[0].message.content || ''
}
