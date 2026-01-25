import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { contentRepository } from '@/repositories/content.repository'
import { SearchContentInputSchema } from '../types'

export function registerSearchContent(server: McpServer) {
  server.tool(
    'search_content',
    'Search content by query across title, description, and name fields',
    SearchContentInputSchema.shape,
    async (input) => {
      const params = SearchContentInputSchema.parse(input)

      // Fetch published content (optionally filtered by type)
      const items = await contentRepository.findPublished(params.type)

      const query = params.query.toLowerCase()

      // Filter by query matching common fields in data JSON
      const filtered = items.filter((item) => {
        const data = item.data as Record<string, unknown>

        // Check common searchable fields
        const searchableFields = ['title', 'description', 'name', 'content', 'company', 'role']
        for (const field of searchableFields) {
          if (typeof data[field] === 'string' && data[field].toLowerCase().includes(query)) {
            return true
          }
        }

        // Check tags array if present
        if (Array.isArray(data.tags)) {
          if (data.tags.some((tag: unknown) => typeof tag === 'string' && tag.toLowerCase().includes(query))) {
            return true
          }
        }

        // Check items array for list-type content (skills, experience, education)
        if (Array.isArray(data.items)) {
          for (const subItem of data.items) {
            if (typeof subItem === 'object' && subItem !== null) {
              for (const field of searchableFields) {
                if (typeof (subItem as Record<string, unknown>)[field] === 'string') {
                  if (((subItem as Record<string, unknown>)[field] as string).toLowerCase().includes(query)) {
                    return true
                  }
                }
              }
            }
          }
        }

        return false
      })

      // Apply limit
      const limited = filtered.slice(0, params.limit)

      const results = limited.map((item) => ({
        id: item.id,
        slug: item.slug,
        type: item.type,
        data: item.data,
        status: item.status,
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
