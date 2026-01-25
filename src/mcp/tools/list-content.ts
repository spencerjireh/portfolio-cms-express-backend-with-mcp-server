import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { contentRepository } from '@/repositories/content.repository'
import { ListContentInputSchema } from '../types'

export function registerListContent(server: McpServer) {
  server.tool(
    'list_content',
    'List content items by type with optional status filter',
    ListContentInputSchema.shape,
    async (input) => {
      const params = ListContentInputSchema.parse(input)

      const items = await contentRepository.findAll({
        type: params.type,
        status: params.status,
        limit: params.limit,
      })

      const results = items.map((item) => ({
        id: item.id,
        slug: item.slug,
        type: item.type,
        data: item.data,
        status: item.status,
        version: item.version,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      }
    }
  )
}
