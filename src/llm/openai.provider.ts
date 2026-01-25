import { env } from '@/config/env'
import { LLMError } from '@/errors/app-error'
import { llmRequestsTotal, llmRequestDuration } from '@/observability/metrics'
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './types'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  max_tokens: number
  temperature: number
}

interface OpenAIChoice {
  index: number
  message: {
    role: string
    content: string
  }
  finish_reason: string
}

interface OpenAIUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: OpenAIChoice[]
  usage: OpenAIUsage
}

interface OpenAIErrorResponse {
  error: {
    message: string
    type: string
    param?: string
    code?: string
  }
}

/**
 * OpenAI provider implementation using native fetch.
 */
export class OpenAIProvider implements LLMProvider {
  private readonly apiKey: string
  private readonly defaultModel: string
  private readonly defaultMaxTokens: number
  private readonly defaultTemperature: number

  constructor() {
    this.apiKey = env.LLM_API_KEY
    this.defaultModel = env.LLM_MODEL
    this.defaultMaxTokens = env.LLM_MAX_TOKENS
    this.defaultTemperature = env.LLM_TEMPERATURE
  }

  async sendMessage(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens
    const temperature = options?.temperature ?? this.defaultTemperature
    const start = process.hrtime.bigint()

    const requestBody: OpenAIRequest = {
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      max_tokens: maxTokens,
      temperature,
    }

    let response: Response

    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1e9
      llmRequestsTotal.inc({ model, status: 'error' })
      llmRequestDuration.observe({ model }, duration)
      throw new LLMError(`Network error: ${(error as Error).message}`, 'openai')
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`

      try {
        const errorBody = (await response.json()) as OpenAIErrorResponse
        if (errorBody.error?.message) {
          errorMessage = errorBody.error.message
        }
      } catch {
        // Use HTTP status as error message
      }

      const duration = Number(process.hrtime.bigint() - start) / 1e9
      llmRequestsTotal.inc({ model, status: 'error' })
      llmRequestDuration.observe({ model }, duration)
      throw new LLMError(errorMessage, 'openai')
    }

    const data = (await response.json()) as OpenAIResponse

    if (!data.choices || data.choices.length === 0) {
      const duration = Number(process.hrtime.bigint() - start) / 1e9
      llmRequestsTotal.inc({ model, status: 'error' })
      llmRequestDuration.observe({ model }, duration)
      throw new LLMError('No response from model', 'openai')
    }

    const choice = data.choices[0]
    const content = choice.message?.content ?? ''

    const duration = Number(process.hrtime.bigint() - start) / 1e9
    llmRequestsTotal.inc({ model, status: 'success' })
    llmRequestDuration.observe({ model }, duration)

    return {
      content,
      tokensUsed: data.usage?.total_tokens ?? 0,
      model: data.model,
    }
  }
}

export const openaiProvider = new OpenAIProvider()
