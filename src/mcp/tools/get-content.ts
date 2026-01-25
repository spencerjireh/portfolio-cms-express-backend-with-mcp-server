import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { contentRepository } from '@/repositories/content.repository'
import { GetContentInputSchema } from '../types'

export function registerGetContent(server: McpServer) {
  server.tool(
    'get_content',
    'Get a single content item by type and slug',
    GetContentInputSchema.shape,
    async (input) => {
      const params = GetContentInputSchema.parse(input)

      const item = await contentRepository.findBySlug(params.type, params.slug)

      if (!item) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { error: `Content not found: ${params.type}/${params.slug}` },
                null,
                2
              ),
            },
          ],
          isError: true,
        }
      }

      const result = {
        id: item.id,
        slug: item.slug,
        type: item.type,
        data: item.data,
        status: item.status,
        version: item.version,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    }
  )
}
