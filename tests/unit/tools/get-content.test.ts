import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock content repository
const mockContentRepository = {
  findAll: jest.fn(),
  findBySlug: jest.fn(),
  findPublished: jest.fn(),
}

jest.unstable_mockModule('@/repositories/content.repository', () => ({
  contentRepository: mockContentRepository,
}))

describe('getContent', () => {
  let getContent: typeof import('@/tools/core/get-content').getContent

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await import('@/tools/core/get-content')
    getContent = module.getContent
  })

  afterEach(() => {
    jest.resetModules()
  })

  it('should get content item by type and slug', async () => {
    const mockItem = {
      id: 'cnt_1',
      slug: 'portfolio-website',
      type: 'project',
      data: { title: 'Portfolio Website', description: 'My portfolio' },
      status: 'published',
      version: 1,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    mockContentRepository.findBySlug.mockResolvedValue(mockItem)

    const result = await getContent({
      type: 'project',
      slug: 'portfolio-website',
    })

    expect(result.success).toBe(true)
    expect(result.data?.item.slug).toBe('portfolio-website')
    expect(result.data?.item.data).toEqual({ title: 'Portfolio Website', description: 'My portfolio' })
    expect(mockContentRepository.findBySlug).toHaveBeenCalledWith('project', 'portfolio-website')
  })

  it('should return error when content not found', async () => {
    mockContentRepository.findBySlug.mockResolvedValue(null)

    const result = await getContent({
      type: 'project',
      slug: 'non-existent',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Content not found: project/non-existent')
  })
})
