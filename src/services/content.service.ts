import { contentRepository } from '@/repositories'
import { NotFoundError, ValidationError } from '@/errors/app-error'
import { generateETag } from '@/lib/etag'
import {
  ContentListQuerySchema,
  ContentTypeSlugParamsSchema,
  parseZodErrors,
} from '@/validation/content.schemas'
import type { ContentType, ContentWithData, ContentBundle } from '@/db/types'

interface ContentListOptions {
  type?: ContentType
}

interface ServiceResponse<T> {
  data: T
  etag: string
}

class ContentService {
  /**
   * Get all published content, optionally filtered by type.
   */
  async getPublishedContent(options?: ContentListOptions): Promise<ServiceResponse<ContentWithData[]>> {
    const data = await contentRepository.findPublished(options?.type)
    const etag = generateETag(data)
    return { data, etag }
  }

  /**
   * Get a single content item by type and slug.
   * Throws NotFoundError if not found or not published.
   */
  async getByTypeAndSlug(type: ContentType, slug: string): Promise<ServiceResponse<ContentWithData>> {
    const content = await contentRepository.findBySlug(type, slug)

    if (!content) {
      throw new NotFoundError('Content', `${type}/${slug}`)
    }

    if (content.status !== 'published') {
      throw new NotFoundError('Content', `${type}/${slug}`)
    }

    const etag = generateETag(content)
    return { data: content, etag }
  }

  /**
   * Get all published content grouped by type.
   */
  async getBundle(): Promise<ServiceResponse<ContentBundle>> {
    const data = await contentRepository.getBundle()
    const etag = generateETag(data)
    return { data, etag }
  }

  /**
   * Validate and parse content list query parameters.
   */
  validateListQuery(query: unknown): ContentListOptions {
    const result = ContentListQuerySchema.safeParse(query)
    if (!result.success) {
      throw new ValidationError('Invalid query parameters', parseZodErrors(result.error))
    }
    return { type: result.data.type }
  }

  /**
   * Validate and parse type/slug route parameters.
   */
  validateTypeSlugParams(params: unknown): { type: ContentType; slug: string } {
    const result = ContentTypeSlugParamsSchema.safeParse(params)
    if (!result.success) {
      throw new ValidationError('Invalid parameters', parseZodErrors(result.error))
    }
    return result.data
  }
}

export const contentService = new ContentService()
