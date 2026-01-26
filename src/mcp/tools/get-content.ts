import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getContent } from '@/tools/core'
import { GetContentInputSchema } from '../types'

export function registerGetContent(server: McpServer) {
  server.tool(
    'get_content',
    'Get a single content item by type and slug',
    GetContentInputSchema.shape,
    async (input) => {
      const result = await getContent(input as Parameters<typeof getContent>[0])

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: result.error }, null, 2),
            },
          ],
          isError: true,
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result.data?.item ?? {}, null, 2),
          },
        ],
      }
    }
  )
}
