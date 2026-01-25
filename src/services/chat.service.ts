import { chatRepository } from '@/repositories'
import { NotFoundError, RateLimitError, ValidationError } from '@/errors/app-error'
import { eventEmitter } from '@/events'
import { rateLimiter } from '@/resilience'
import { CircuitBreaker } from '@/resilience/circuit-breaker'
import { getLLMProvider } from '@/llm'
import type { LLMMessage } from '@/llm'
import { obfuscationService, type PIIToken } from './obfuscation.service'
import {
  SendMessageRequestSchema,
  SessionIdParamSchema,
  SessionListQuerySchema,
  parseZodErrors,
} from '@/validation/chat.schemas'
import type { ChatSession, ChatMessage, SessionStatus } from '@/db/types'

const SYSTEM_PROMPT = `You are a helpful assistant for Spencer's portfolio website.
You can answer questions about Spencer's projects, skills, experience, and education.
Be concise, professional, and helpful. If you don't know something, say so.
Do not share any personal information that wasn't explicitly provided to you.`

export interface SendMessageInput {
  visitorId: string
  ipHash: string
  message: string
  userAgent?: string
}

export interface ChatMessageResponse {
  id: string
  role: 'assistant'
  content: string
  createdAt: string
}

export interface ChatResponse {
  sessionId: string
  message: ChatMessageResponse
  tokensUsed: number
}

export interface SessionWithMessages extends ChatSession {
  messages: ChatMessage[]
}

export interface SessionListOptions {
  status?: SessionStatus
  limit?: number
  offset?: number
}

// Circuit breaker for LLM calls
const llmCircuitBreaker = new CircuitBreaker({
  name: 'llm',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
})

class ChatService {
  /**
   * Validates and parses a send message request body.
   */
  validateSendMessageRequest(body: unknown): { message: string; visitorId: string } {
    const result = SendMessageRequestSchema.safeParse(body)
    if (!result.success) {
      throw new ValidationError('Invalid request body', parseZodErrors(result.error))
    }
    return result.data
  }

  /**
   * Validates and parses session ID parameters.
   */
  validateSessionIdParam(params: unknown): { id: string } {
    const result = SessionIdParamSchema.safeParse(params)
    if (!result.success) {
      throw new ValidationError('Invalid session ID', parseZodErrors(result.error))
    }
    return result.data
  }

  /**
   * Validates and parses session list query parameters.
   */
  validateSessionListQuery(query: unknown): SessionListOptions {
    const result = SessionListQuerySchema.safeParse(query)
    if (!result.success) {
      throw new ValidationError('Invalid query parameters', parseZodErrors(result.error))
    }
    return result.data
  }

  /**
   * Main method to send a message and get a response.
   * Handles rate limiting, session management, PII obfuscation, and LLM calls.
   */
  async sendMessage(input: SendMessageInput): Promise<ChatResponse> {
    const { visitorId, ipHash, message, userAgent } = input

    // 1. Rate limit check
    const rateLimitResult = await rateLimiter.consume(ipHash)
    if (!rateLimitResult.allowed) {
      rateLimiter.emitRateLimitEvent(ipHash, undefined, rateLimitResult.retryAfter)
      throw new RateLimitError(rateLimitResult.retryAfter ?? 3)
    }

    // 2. Get or create session
    let session = await chatRepository.findActiveSession(visitorId)

    if (!session) {
      session = await chatRepository.createSession({
        visitorId,
        ipHash,
        userAgent,
      })

      eventEmitter.emit('chat:session_started', {
        sessionId: session.id,
        visitorId,
        ipHash,
      })
    }

    // 3. Obfuscate user message
    const { text: obfuscatedMessage, tokens: piiTokens } = obfuscationService.obfuscate(message)

    // 4. Store user message (obfuscated)
    await chatRepository.addMessage(session.id, {
      role: 'user',
      content: obfuscatedMessage,
    })

    // 5. Build conversation history
    const conversationHistory = await this.buildConversationHistory(session.id)

    // 6. Call LLM through circuit breaker
    const llmProvider = getLLMProvider()
    const llmResponse = await llmCircuitBreaker.execute(() => llmProvider.sendMessage(conversationHistory))

    // 7. Deobfuscate response (in case LLM echoed back placeholders)
    const deobfuscatedContent = this.deobfuscateResponse(llmResponse.content, piiTokens)

    // 8. Store assistant message
    const assistantMessage = await chatRepository.addMessage(session.id, {
      role: 'assistant',
      content: deobfuscatedContent,
      tokensUsed: llmResponse.tokensUsed,
      model: llmResponse.model,
    })

    // 9. Emit events
    eventEmitter.emit('chat:message_sent', {
      sessionId: session.id,
      messageId: assistantMessage.id,
      role: 'assistant',
      tokensUsed: llmResponse.tokensUsed,
    })

    return {
      sessionId: session.id,
      message: {
        id: assistantMessage.id,
        role: 'assistant',
        content: deobfuscatedContent,
        createdAt: assistantMessage.createdAt,
      },
      tokensUsed: llmResponse.tokensUsed,
    }
  }

  /**
   * Lists chat sessions with optional filtering.
   */
  async listSessions(options?: SessionListOptions): Promise<ChatSession[]> {
    const { status, limit = 50, offset = 0 } = options ?? {}

    // The repository doesn't have a listSessions method, so we need to query directly
    // For now, we'll return an empty array since the repository needs to be extended
    // In a real implementation, you'd add this method to the repository
    const sessions = await this.getSessionsFromRepository(status, limit, offset)
    return sessions
  }

  /**
   * Gets a session with all its messages.
   */
  async getSession(id: string): Promise<SessionWithMessages> {
    const session = await chatRepository.findSession(id)
    if (!session) {
      throw new NotFoundError('Session', id)
    }

    const messages = await chatRepository.getMessages(id)

    return {
      ...session,
      messages,
    }
  }

  /**
   * Ends a session.
   */
  async endSession(id: string): Promise<{ success: boolean }> {
    const session = await chatRepository.findSession(id)
    if (!session) {
      throw new NotFoundError('Session', id)
    }

    const success = await chatRepository.endSession(id)

    if (success) {
      const stats = await chatRepository.getStats(id)

      eventEmitter.emit('chat:session_ended', {
        sessionId: id,
        reason: 'user_ended',
        messageCount: stats?.messageCount ?? 0,
        totalTokens: stats?.totalTokens ?? 0,
        durationMs: stats?.durationMs ?? 0,
      })
    }

    return { success }
  }

  /**
   * Builds the conversation history for the LLM, including system prompt.
   */
  private async buildConversationHistory(sessionId: string): Promise<LLMMessage[]> {
    const messages = await chatRepository.getMessages(sessionId)

    const history: LLMMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }]

    for (const msg of messages) {
      history.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    return history
  }

  /**
   * Deobfuscates LLM response in case it echoed back placeholders.
   * Only replaces placeholders if they appear in the response.
   */
  private deobfuscateResponse(content: string, tokens: PIIToken[]): string {
    let result = content

    for (const token of tokens) {
      // Only replace if the placeholder appears in the response
      if (result.includes(token.placeholder)) {
        result = result.replace(token.placeholder, token.original)
      }
    }

    return result
  }

  /**
   * Helper method to get sessions from repository.
   * This is a workaround until the repository is extended with a proper list method.
   */
  private async getSessionsFromRepository(
    status?: SessionStatus,
    limit = 50,
    offset = 0
  ): Promise<ChatSession[]> {
    // Import the db client and schema for direct query
    const { db } = await import('@/db/client')
    const { chatSessions } = await import('@/db/schema')
    const { eq, desc } = await import('drizzle-orm')

    let query = db.select().from(chatSessions).$dynamic()

    if (status) {
      query = query.where(eq(chatSessions.status, status))
    }

    const result = await query.orderBy(desc(chatSessions.lastActiveAt)).limit(limit).offset(offset)

    return result
  }
}

export const chatService = new ChatService()
