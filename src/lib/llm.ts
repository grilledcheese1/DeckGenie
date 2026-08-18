import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = 'claude-sonnet-4-6'

export class ClaudeResponseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ClaudeResponseError'
  }
}

export async function callClaudeJson<T>(
  prompt: string,
  maxTokens: number,
  validate: (value: unknown) => value is T,
  client: Anthropic = anthropic
): Promise<T> {
  let message
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    throw new ClaudeResponseError('Anthropic request failed', err)
  }

  const block = message.content[0]
  if (block.type !== 'text') {
    throw new ClaudeResponseError(`Expected a text content block, got "${block.type}"`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(block.text.trim())
  } catch (err) {
    throw new ClaudeResponseError('Claude response was not valid JSON', err)
  }

  if (!validate(parsed)) {
    throw new ClaudeResponseError('Claude response did not match the expected shape', parsed)
  }

  return parsed
}
