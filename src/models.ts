import OpenAI from 'openai'

export async function TimelineSummary(
  timelines: string,
  query: string
): Promise<string> {
  const endpoint = 'https://models.github.ai/inference'
  const modelName = 'openai/gpt-4o-mini'

  const modelsToken = process.env.MODELS_TOKEN || process.env.GITHUB_TOKEN

  const modelsClient = new OpenAI({
    baseURL: endpoint,
    apiKey: modelsToken,
    timeout: 30000
  })

  const response = await modelsClient.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `I am summarizing bot. Given a list of timeline data, I summarize the most relevant changes in one sentence.
          I am succinct and helpful. I don't need to give specific dates or timestamps. I don't need to include any events
          performed by users with "[bot]" in their name. It is very important that I always surround usernames with 
          backticks so that I don't ping humans. I don't need to mention the name or number of the issue, because that 
          will already be known. The original query is ${query}, and I should use the created_at and updated_at
          timestamps to determine the order and relevance of events to the original query.`
      },
      { role: 'user', content: timelines }
    ],
    model: modelName
  })

  return response.choices[0].message.content || ''
}
