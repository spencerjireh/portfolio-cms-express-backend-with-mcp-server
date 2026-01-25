import { Router, type Request, type Response, type NextFunction } from 'express'
import { chatService } from '@/services/chat.service'
import { extractClientIP, hashIP } from '@/lib/ip'

export const chatRouter = Router()

/**
 * Async handler wrapper to forward promise rejections to error handler.
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * POST /api/v1/chat
 * Send a message to the chat assistant.
 *
 * Body: { message: string, visitorId: string }
 * Response: { sessionId, message: { id, role, content, createdAt }, tokensUsed }
 */
chatRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { message, visitorId } = chatService.validateSendMessageRequest(req.body)

    // Extract and hash client IP for rate limiting
    const clientIP = extractClientIP(req)
    const ipHash = hashIP(clientIP)

    // Get user agent
    const userAgent = req.headers['user-agent']

    // Send message and get response
    const response = await chatService.sendMessage({
      visitorId,
      ipHash,
      message,
      userAgent,
    })

    res.json(response)
  })
)
