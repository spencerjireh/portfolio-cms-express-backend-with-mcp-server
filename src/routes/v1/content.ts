import { Router, type Request, type Response, type NextFunction } from 'express'
import { contentService } from '@/services/content.service'
import { isStale, setCacheHeaders } from '@/lib/etag'

export const contentRouter = Router()

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
 * GET /api/v1/content
 * List published content, optionally filtered by type.
 */
contentRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const options = contentService.validateListQuery(req.query)
    const { data, etag } = await contentService.getPublishedContent(options)

    if (!isStale(etag, req.headers['if-none-match'])) {
      res.status(304).end()
      return
    }

    setCacheHeaders(res, { etag, maxAge: 60 })
    res.json({ data })
  })
)

/**
 * GET /api/v1/content/bundle
 * Get all published content grouped by type.
 */
contentRouter.get(
  '/bundle',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, etag } = await contentService.getBundle()

    if (!isStale(etag, req.headers['if-none-match'])) {
      res.status(304).end()
      return
    }

    setCacheHeaders(res, { etag, maxAge: 300 })
    res.json({ data })
  })
)

/**
 * GET /api/v1/content/:type/:slug
 * Get a single content item by type and slug.
 */
contentRouter.get(
  '/:type/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, slug } = contentService.validateTypeSlugParams(req.params)
    const { data, etag } = await contentService.getByTypeAndSlug(type, slug)

    if (!isStale(etag, req.headers['if-none-match'])) {
      res.status(304).end()
      return
    }

    setCacheHeaders(res, { etag, maxAge: 300 })
    res.json({ data })
  })
)
