import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { contentRepository } from '@/repositories/content.repository'
import { UpdateContentInputSchema } from '../types'
import { validateContentData } from '@/validation/content.schemas'
import type { ContentType } from '@/db/schema'

export function registerUpdateContent(server: McpServer) {
  server.tool(
    'update_content',
    'Update existing content with version history tracking',
    UpdateContentInputSchema.shape,
    async (input) => {
      const params = UpdateContentInputSchema.parse(input)

      // Verify content exists
      const existing = await contentRepository.findById(params.id)
      if (!existing) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `Content not found: ${params.id}` }, null, 2),
            },
          ],
          isError: true,
        }
      }

      // If data is provided, validate against type-specific schema
      let validatedData: Record<string, unknown> | undefined
      if (params.data) {
        const validationResult = validateContentData(existing.type as ContentType, params.data)
        if ('valid' in validationResult && validationResult.valid === false) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { error: 'Validation failed', details: validationResult.errors },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        validatedData = validationResult
      }

      // If slug is being changed, verify it doesn't conflict
      if (params.slug && params.slug !== existing.slug) {
        const exists = await contentRepository.slugExists(
          existing.type as ContentType,
          params.slug,
          params.id
        )
        if (exists) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { error: `Slug already exists: ${existing.type}/${params.slug}` },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
      }

      const updated = await contentRepository.updateWithHistory(params.id, {
        slug: params.slug,
        data: validatedData,
        status: params.status,
        sortOrder: params.sortOrder,
      })

      if (!updated) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Update failed' }, null, 2),
            },
          ],
          isError: true,
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                content: {
                  id: updated.id,
                  slug: updated.slug,
                  type: updated.type,
                  data: updated.data,
                  status: updated.status,
                  version: updated.version,
                  sortOrder: updated.sortOrder,
                  createdAt: updated.createdAt,
                  updatedAt: updated.updatedAt,
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
