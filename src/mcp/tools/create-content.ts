import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { contentRepository } from '@/repositories/content.repository'
import { CreateContentInputSchema } from '../schemas'
import { validateContentData } from '@/validation/content.schemas'
import { ValidationError } from '@/errors/app.error'
import type { ContentType } from '@/db/schema'

function generateSlug(data: Record<string, unknown>): string {
  // Try to use title or name field to generate slug
  const text = (data.title as string) || (data.name as string) || ''
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

export function registerCreateContent(server: McpServer) {
  server.tool(
    'create_content',
    'Create new content with type-specific data validation',
    CreateContentInputSchema.shape,
    async (input) => {
      const params = CreateContentInputSchema.parse(input)

      // Validate data against type-specific schema
      let validationResult: Record<string, unknown>
      try {
        validationResult = validateContentData(params.type as ContentType, params.data)
      } catch (error) {
        if (error instanceof ValidationError) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { error: 'Validation failed', details: error.fields },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        throw error
      }

      // Generate slug if not provided
      const slug = params.slug || generateSlug(params.data)
      if (!slug) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { error: 'Slug is required (provide slug or include title/name in data)' },
                null,
                2
              ),
            },
          ],
          isError: true,
        }
      }

      // Check if slug already exists
      const exists = await contentRepository.slugExists(params.type as ContentType, slug)
      if (exists) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { error: `Slug already exists: ${params.type}/${slug}` },
                null,
                2
              ),
            },
          ],
          isError: true,
        }
      }

      const created = await contentRepository.create({
        type: params.type as ContentType,
        slug,
        data: validationResult,
        status: params.status,
        sortOrder: params.sortOrder,
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                content: {
                  id: created.id,
                  slug: created.slug,
                  type: created.type,
                  data: created.data,
                  status: created.status,
                  version: created.version,
                  sortOrder: created.sortOrder,
                  createdAt: created.createdAt,
                  updatedAt: created.updatedAt,
                },
              },
              null,
              2
            ),
          },
        ],
      }
    }
  )
}
