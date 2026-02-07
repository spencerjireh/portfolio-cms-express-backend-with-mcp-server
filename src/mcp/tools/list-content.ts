import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listContent } from '@/tools/core'
import { ListContentInputSchema } from '../schemas'

export function registerListContent(server: McpServer) {
  server.tool(
    'list_content',
    'List content items by type with optional status filter',
    ListContentInputSchema.shape,
    async (input) => {
      const result = await listContent(input as Parameters<typeof listContent>[0])

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result.data?.items ?? [], null, 2),
          },
        ],
      }
    }
  )
}
