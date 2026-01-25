import { z, type ZodError } from 'zod'
import { contentTypeEnum, contentStatusEnum } from '@/db/schema'

// Slug validation
export const SlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only')

// Content type enum
export const ContentTypeSchema = z.enum(contentTypeEnum)

// Content status enum
export const ContentStatusSchema = z.enum(contentStatusEnum)

// Project data schema
export const ProjectDataSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  content: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  links: z
    .object({
      github: z.string().url().optional(),
      live: z.string().url().optional(),
      demo: z.string().url().optional(),
    })
    .optional(),
  coverImage: z.string().url().optional(),
  featured: z.boolean().default(false),
})

// Page data schema
export const PageDataSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  image: z.string().url().optional(),
})

// Skills list data schema
export const SkillsListDataSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        category: z.enum(['language', 'framework', 'tool', 'soft']),
        icon: z.string().max(100).optional(),
        proficiency: z.number().int().min(1).max(5).optional(),
      })
    )
    .max(100),
})

// Experience list data schema
export const ExperienceListDataSchema = z.object({
  items: z
    .array(
      z.object({
        company: z.string().min(1).max(200),
        role: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM')
          .nullable(),
        location: z.string().max(100).optional(),
        type: z.enum(['full-time', 'part-time', 'contract', 'freelance']).optional(),
        skills: z.array(z.string().max(50)).max(20).default([]),
      })
    )
    .max(50),
})

// Education list data schema
export const EducationListDataSchema = z.object({
  items: z
    .array(
      z.object({
        institution: z.string().min(1).max(200),
        degree: z.string().min(1).max(200),
        field: z.string().max(200).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM')
          .nullable(),
        location: z.string().max(100).optional(),
        gpa: z.string().max(20).optional(),
        highlights: z.array(z.string().max(200)).max(10).optional(),
      })
    )
    .max(20),
})

// Site config data schema
export const SiteConfigDataSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  email: z.string().email(),
  social: z.record(z.string().url()),
  chatEnabled: z.boolean().default(true),
  chatSystemPrompt: z.string().max(2000).optional(),
})

// Query schema for listing content
export const ContentListQuerySchema = z.object({
  type: ContentTypeSchema.optional(),
  status: ContentStatusSchema.optional().default('published'),
})

// Route params schema for type and slug
export const ContentTypeSlugParamsSchema = z.object({
  type: ContentTypeSchema,
  slug: SlugSchema,
})

// Type exports
export type ProjectData = z.infer<typeof ProjectDataSchema>
export type PageData = z.infer<typeof PageDataSchema>
export type SkillsListData = z.infer<typeof SkillsListDataSchema>
export type ExperienceListData = z.infer<typeof ExperienceListDataSchema>
export type EducationListData = z.infer<typeof EducationListDataSchema>
export type SiteConfigData = z.infer<typeof SiteConfigDataSchema>
export type ContentListQuery = z.infer<typeof ContentListQuerySchema>
export type ContentTypeSlugParams = z.infer<typeof ContentTypeSlugParamsSchema>

/**
 * Transform Zod errors into a field-level error map.
 */
export function parseZodErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root'
    if (!fields[path]) {
      fields[path] = []
    }
    fields[path].push(issue.message)
  }
  return fields
}
