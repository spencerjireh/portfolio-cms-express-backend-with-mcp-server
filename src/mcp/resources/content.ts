import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { contentRepository } from '@/repositories/content.repository'
import { contentTypeEnum, type ContentType } from '@/db/schema'

export function registerContentResources(server: McpServer) {
  // List all published content
  server.resource('portfolio://content', 'portfolio://content', async () => {
    const items = await contentRepository.findPublished()

    const results = items.map((item) => ({
      id: item.id,
      slug: item.slug,
      type: item.type,
      data: item.data,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    return {
      contents: [
        {
          uri: 'portfolio://content',
          mimeType: 'application/json',
          text: JSON.stringify(results, null, 2),
        },
      ],
    }
  })

  // List content by type - register one resource per type
  for (const type of contentTypeEnum) {
    server.resource(
      `portfolio://content/${type}`,
      `portfolio://content/${type}`,
      async () => {
        const items = await contentRepository.findPublished(type as ContentType)

        const results = items.map((item) => ({
          id: item.id,
          slug: item.slug,
          type: item.type,
          data: item.data,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }))

        return {
          contents: [
            {
              uri: `portfolio://content/${type}`,
              mimeType: 'application/json',
              text: JSON.stringify(results, null, 2),
            },
          ],
        }
      }
    )

    // Single content item by type and slug
    server.resource(
      `portfolio://content/${type}/{slug}`,
      `portfolio://content/${type}/{slug}`,
      async (uri) => {
        // Extract slug from URI
        const match = uri.href.match(new RegExp(`portfolio://content/${type}/(.+)`))
        if (!match) {
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify({ error: 'Invalid URI format' }),
              },
            ],
          }
        }

        const slug = match[1]
        const item = await contentRepository.findBySlug(type as ContentType, slug)

        if (!item) {
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify({ error: `Content not found: ${type}/${slug}` }),
              },
            ],
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
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }
    )
  }
}
