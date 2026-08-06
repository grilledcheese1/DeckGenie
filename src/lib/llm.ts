import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = 'claude-sonnet-4-6'

export class ClaudeResponseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ClaudeResponseError'
  }
}

export async function callClaudeJson<T = unknown>(prompt: string, maxTokens: number): Promise<T> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    throw new ClaudeResponseError(`Expected a text content block, got "${block.type}"`)
  }

  try {
    return JSON.parse(block.text.trim()) as T
  } catch (err) {
    throw new ClaudeResponseError('Claude response was not valid JSON', err)
  }
}
