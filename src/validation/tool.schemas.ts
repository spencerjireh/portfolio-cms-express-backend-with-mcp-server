import { z } from 'zod'
import { contentTypeEnum, contentStatusEnum } from '@/db/schema'

// Content type and status schemas using existing enums
export const ContentTypeSchema = z.enum(contentTypeEnum)
export const ContentStatusSchema = z.enum(contentStatusEnum)

// Generic tool input schemas
export const ListContentInputSchema = z.object({
  type: ContentTypeSchema.describe('Content type to list'),
  status: ContentStatusSchema.default('published').describe('Filter by status'),
  limit: z.number().min(1).max(100).default(50).describe('Maximum items to return'),
})

export const GetContentInputSchema = z.object({
  type: ContentTypeSchema.describe('Content type'),
  slug: z.string().describe('Content slug identifier'),
})

export const SearchContentInputSchema = z.object({
  query: z.string().describe('Search query'),
  type: ContentTypeSchema.optional().describe('Filter by content type'),
  limit: z.number().min(1).max(50).default(10).describe('Maximum items to return'),
})

// Type exports
export type ListContentInput = z.infer<typeof ListContentInputSchema>
export type GetContentInput = z.infer<typeof GetContentInputSchema>
export type SearchContentInput = z.infer<typeof SearchContentInputSchema>
