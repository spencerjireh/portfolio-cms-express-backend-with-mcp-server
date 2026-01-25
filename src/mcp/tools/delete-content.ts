import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { contentRepository } from '@/repositories/content.repository'
import { DeleteContentInputSchema } from '../types'

export function registerDeleteContent(server: McpServer) {
  server.tool(
    'delete_content',
    'Soft delete content (can be restored later)',
    DeleteContentInputSchema.shape,
    async (input) => {
      const params = DeleteContentInputSchema.parse(input)

      // Verify content exists before attempting delete
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

      const success = await contentRepository.delete(params.id)

      if (!success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Delete failed' }, null, 2),
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
                message: `Content deleted: ${existing.type}/${existing.slug}`,
                id: params.id,
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
