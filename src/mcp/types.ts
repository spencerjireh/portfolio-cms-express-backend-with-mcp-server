import { z } from 'zod'
import { contentTypeEnum, contentStatusEnum } from '@/db/schema'

// Content type and status schemas using existing enums
const ContentTypeSchema = z.enum(contentTypeEnum)
const ContentStatusSchema = z.enum(contentStatusEnum)

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

export const CreateContentInputSchema = z.object({
  type: ContentTypeSchema.describe('Content type to create'),
  slug: z.string().optional().describe('URL-friendly slug (auto-generated if not provided)'),
  data: z.record(z.unknown()).describe('Content data matching the type schema'),
  status: ContentStatusSchema.default('draft').describe('Initial status'),
  sortOrder: z.number().default(0).describe('Sort order for display'),
})

export const UpdateContentInputSchema = z.object({
  id: z.string().describe('Content ID to update'),
  slug: z.string().optional().describe('New slug'),
  data: z.record(z.unknown()).optional().describe('Updated content data'),
  status: ContentStatusSchema.optional().describe('New status'),
  sortOrder: z.number().optional().describe('New sort order'),
})

export const DeleteContentInputSchema = z.object({
  id: z.string().describe('Content ID to delete'),
})

// Keep prompt schemas (specialized by design)
export const SummarizePortfolioArgsSchema = z.object({
  audience: z.enum(['recruiter', 'technical', 'general']),
})

export const ExplainProjectArgsSchema = z.object({
  slug: z.string(),
  depth: z.enum(['overview', 'detailed', 'deep-dive']),
})

export const CompareSkillsArgsSchema = z.object({
  requiredSkills: z.array(z.string()),
  niceToHave: z.array(z.string()).optional(),
})

// MCP Prompt argument shapes (MCP prompts receive string arguments from users)
export const CompareSkillsPromptArgsShape = {
  requiredSkills: z.string().describe('Comma-separated list of required skills for the job'),
  niceToHave: z.string().optional().describe('Comma-separated list of nice-to-have skills'),
}

export const ExplainProjectPromptArgsShape = {
  slug: z.string().describe('The project slug to explain'),
  depth: z.enum(['overview', 'detailed', 'deep-dive']).describe('Level of detail: overview, detailed, or deep-dive'),
}

export const SummarizePortfolioPromptArgsShape = {
  audience: z.enum(['recruiter', 'technical', 'general']).describe('Target audience: recruiter, technical, or general'),
}

// Type exports
export type ListContentInput = z.infer<typeof ListContentInputSchema>
export type GetContentInput = z.infer<typeof GetContentInputSchema>
export type SearchContentInput = z.infer<typeof SearchContentInputSchema>
export type CreateContentInput = z.infer<typeof CreateContentInputSchema>
export type UpdateContentInput = z.infer<typeof UpdateContentInputSchema>
export type DeleteContentInput = z.infer<typeof DeleteContentInputSchema>
export type SummarizePortfolioArgs = z.infer<typeof SummarizePortfolioArgsSchema>
export type ExplainProjectArgs = z.infer<typeof ExplainProjectArgsSchema>
export type CompareSkillsArgs = z.infer<typeof CompareSkillsArgsSchema>
