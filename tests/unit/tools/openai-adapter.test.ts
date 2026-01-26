import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock core tool functions
const mockListContent = jest.fn()
const mockGetContent = jest.fn()
const mockSearchContent = jest.fn()

jest.unstable_mockModule('@/tools/core', () => ({
  listContent: mockListContent,
  getContent: mockGetContent,
  searchContent: mockSearchContent,
}))

// Mock content repository (needed by core modules)
jest.unstable_mockModule('@/repositories/content.repository', () => ({
  contentRepository: {
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    findPublished: jest.fn(),
  },
}))

describe('OpenAI Adapter', () => {
  let executeToolCall: typeof import('@/tools/openai-adapter').executeToolCall
  let chatToolDefinitions: typeof import('@/tools/openai-adapter').chatToolDefinitions

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await import('@/tools/openai-adapter')
    executeToolCall = module.executeToolCall
    chatToolDefinitions = module.chatToolDefinitions
  })

  afterEach(() => {
    jest.resetModules()
  })

  describe('chatToolDefinitions', () => {
    it('should have three tool definitions', () => {
      expect(chatToolDefinitions).toHaveLength(3)
    })

    it('should include list_content tool', () => {
      const listTool = chatToolDefinitions.find((t) => t.name === 'list_content')
      expect(listTool).toBeDefined()
      expect(listTool?.description).toContain('List')
      expect(listTool?.parameters).toBeDefined()
    })

    it('should include get_content tool', () => {
      const getTool = chatToolDefinitions.find((t) => t.name === 'get_content')
      expect(getTool).toBeDefined()
      expect(getTool?.description).toContain('Get')
      expect(getTool?.parameters).toBeDefined()
    })

    it('should include search_content tool', () => {
      const searchTool = chatToolDefinitions.find((t) => t.name === 'search_content')
      expect(searchTool).toBeDefined()
      expect(searchTool?.description).toContain('Search')
      expect(searchTool?.parameters).toBeDefined()
    })
  })

  describe('executeToolCall', () => {
    it('should execute list_content tool', async () => {
      mockListContent.mockResolvedValue({
        success: true,
        data: { items: [{ id: '1', slug: 'test' }] },
      })

      const result = await executeToolCall({
        id: 'call_123',
        type: 'function',
        function: {
          name: 'list_content',
          arguments: JSON.stringify({ type: 'project', status: 'published', limit: 50 }),
        },
      })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.data.items).toHaveLength(1)
      expect(mockListContent).toHaveBeenCalledWith({ type: 'project', status: 'published', limit: 50 })
    })

    it('should execute get_content tool', async () => {
      mockGetContent.mockResolvedValue({
        success: true,
        data: { item: { id: '1', slug: 'portfolio' } },
      })

      const result = await executeToolCall({
        id: 'call_123',
        type: 'function',
        function: {
          name: 'get_content',
          arguments: JSON.stringify({ type: 'project', slug: 'portfolio' }),
        },
      })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.data.item.slug).toBe('portfolio')
      expect(mockGetContent).toHaveBeenCalledWith({ type: 'project', slug: 'portfolio' })
    })

    it('should execute search_content tool', async () => {
      mockSearchContent.mockResolvedValue({
        success: true,
        data: { items: [{ id: '1', slug: 'react-project' }] },
      })

      const result = await executeToolCall({
        id: 'call_123',
        type: 'function',
        function: {
          name: 'search_content',
          arguments: JSON.stringify({ query: 'react', limit: 10 }),
        },
      })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.data.items).toHaveLength(1)
      expect(mockSearchContent).toHaveBeenCalledWith({ query: 'react', limit: 10 })
    })

    it('should return error for unknown tool', async () => {
      const result = await executeToolCall({
        id: 'call_123',
        type: 'function',
        function: {
          name: 'unknown_tool',
          arguments: '{}',
        },
      })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toBe('Unknown tool: unknown_tool')
    })

    it('should return error for invalid JSON arguments', async () => {
      const result = await executeToolCall({
        id: 'call_123',
        type: 'function',
        function: {
          name: 'list_content',
          arguments: 'invalid json',
        },
      })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toBe('Invalid JSON arguments')
    })
  })
})
