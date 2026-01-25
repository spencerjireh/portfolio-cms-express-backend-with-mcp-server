export type MessageRole = 'user' | 'assistant' | 'system'

export interface LLMMessage {
  role: MessageRole
  content: string
}

export interface LLMOptions {
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface LLMResponse {
  content: string
  tokensUsed: number
  model: string
}

export interface LLMProvider {
  sendMessage(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>
}
