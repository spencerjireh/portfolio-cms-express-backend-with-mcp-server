import { Router, type Request, type Response, type NextFunction } from 'express'
import { chatService } from '@/services/chat.service'
import { adminAuthMiddleware } from '@/middleware/admin-auth'

export const adminChatRouter = Router()

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

// Apply admin auth to all routes
adminChatRouter.use(adminAuthMiddleware())

/**
 * GET /api/v1/admin/chat/sessions
 * List chat sessions with optional filtering.
 *
 * Query: { status?: 'active' | 'ended' | 'expired', limit?: number, offset?: number }
 */
adminChatRouter.get(
  '/sessions',
  asyncHandler(async (req: Request, res: Response) => {
    const options = chatService.validateSessionListQuery(req.query)
    const sessions = await chatService.listSessions(options)
    res.json({ data: sessions })
  })
)

/**
 * GET /api/v1/admin/chat/sessions/:id
 * Get a single session with all its messages.
 */
adminChatRouter.get(
  '/sessions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = chatService.validateSessionIdParam(req.params)
    const session = await chatService.getSession(id)
    res.json({ data: session })
  })
)

/**
 * DELETE /api/v1/admin/chat/sessions/:id
 * End a chat session.
 */
adminChatRouter.delete(
  '/sessions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = chatService.validateSessionIdParam(req.params)
    const result = await chatService.endSession(id)
    res.json(result)
  })
)
