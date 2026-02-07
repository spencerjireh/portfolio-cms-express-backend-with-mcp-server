import { z } from 'zod'

// Re-export shared tool schemas from validation layer
export {
  ContentTypeSchema,
  ContentStatusSchema,
  ListContentInputSchema,
  GetContentInputSchema,
  SearchContentInputSchema,
  type ListContentInput,
  type GetContentInput,
  type SearchContentInput,
} from '@/validation/tool.schemas'

export const CreateContentInputSchema = z.object({
  type: z.enum(['project', 'experience', 'education', 'skill', 'about', 'contact']).describe('Content type to create'),
  slug: z.string().optional().describe('URL-friendly slug (auto-generated if not provided)'),
  data: z.record(z.unknown()).describe('Content data matching the type schema'),
  status: z.enum(['draft', 'published', 'archived']).default('draft').describe('Initial status'),
  sortOrder: z.number().default(0).describe('Sort order for display'),
})

export const UpdateContentInputSchema = z.object({
  id: z.string().describe('Content ID to update'),
  slug: z.string().optional().describe('New slug'),
  data: z.record(z.unknown()).optional().describe('Updated content data'),
  status: z.enum(['draft', 'published', 'archived']).optional().describe('New status'),
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
  depth: z
    .enum(['overview', 'detailed', 'deep-dive'])
    .describe('Level of detail: overview, detailed, or deep-dive'),
}

export const SummarizePortfolioPromptArgsShape = {
  audience: z
    .enum(['recruiter', 'technical', 'general'])
    .describe('Target audience: recruiter, technical, or general'),
}

// Type exports
export type CreateContentInput = z.infer<typeof CreateContentInputSchema>
export type UpdateContentInput = z.infer<typeof UpdateContentInputSchema>
export type DeleteContentInput = z.infer<typeof DeleteContentInputSchema>
export type SummarizePortfolioArgs = z.infer<typeof SummarizePortfolioArgsSchema>
export type ExplainProjectArgs = z.infer<typeof ExplainProjectArgsSchema>
export type CompareSkillsArgs = z.infer<typeof CompareSkillsArgsSchema>
