import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchContent } from '@/tools/core'
import { SearchContentInputSchema } from '../schemas'

export function registerSearchContent(server: McpServer) {
  server.tool(
    'search_content',
    'Search content by query across title, description, and name fields',
    SearchContentInputSchema.shape,
    async (input) => {
      const result = await searchContent(input as Parameters<typeof searchContent>[0])

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
