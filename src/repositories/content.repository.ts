import { eq, and, isNull, desc, asc } from 'drizzle-orm'
import { db } from '../db/client'
import { content, contentHistory } from '../db/schema'
import { contentId, historyId } from '../lib/id'
import type {
  Content,
  ContentHistory,
  ContentWithData,
  ContentBundle,
  CreateContentDto,
  UpdateContentDto,
  ContentType,
} from '../db/types'

function parseContentData<T = Record<string, unknown>>(row: Content): ContentWithData<T> {
  return {
    ...row,
    data: JSON.parse(row.data) as T,
  }
}

export class ContentRepository {
  async findById(id: string): Promise<ContentWithData | null> {
    const result = await db
      .select()
      .from(content)
      .where(and(eq(content.id, id), isNull(content.deletedAt)))
      .limit(1)

    if (result.length === 0) return null
    return parseContentData(result[0])
  }

  async findBySlug(type: ContentType, slug: string): Promise<ContentWithData | null> {
    const result = await db
      .select()
      .from(content)
      .where(and(eq(content.type, type), eq(content.slug, slug), isNull(content.deletedAt)))
      .limit(1)

    if (result.length === 0) return null
    return parseContentData(result[0])
  }

  async findByType(type: ContentType): Promise<ContentWithData[]> {
    const results = await db
      .select()
      .from(content)
      .where(and(eq(content.type, type), isNull(content.deletedAt)))
      .orderBy(asc(content.sortOrder), desc(content.createdAt))

    return results.map(parseContentData)
  }

  async findPublished(type?: ContentType): Promise<ContentWithData[]> {
    const conditions = [eq(content.status, 'published'), isNull(content.deletedAt)]
    if (type) {
      conditions.push(eq(content.type, type))
    }

    const results = await db
      .select()
      .from(content)
      .where(and(...conditions))
      .orderBy(asc(content.sortOrder), desc(content.createdAt))

    return results.map(parseContentData)
  }

  async create(dto: CreateContentDto, changedBy?: string): Promise<ContentWithData> {
    const id = contentId()
    const now = new Date().toISOString()

    const newContent = {
      id,
      type: dto.type,
      slug: dto.slug,
      data: JSON.stringify(dto.data),
      status: dto.status ?? 'draft',
      version: 1,
      sortOrder: dto.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    }

    const historyEntry = {
      id: historyId(),
      contentId: id,
      version: 1,
      data: JSON.stringify(dto.data),
      changeType: 'created' as const,
      changedBy,
      changeSummary: `Created ${dto.type}: ${dto.slug}`,
      createdAt: now,
    }

    await db.batch([db.insert(content).values(newContent), db.insert(contentHistory).values(historyEntry)])

    return {
      ...newContent,
      deletedAt: null,
      data: dto.data,
    }
  }

  async updateWithHistory(
    id: string,
    updates: UpdateContentDto,
    changedBy?: string
  ): Promise<ContentWithData | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const newVersion = existing.version + 1

    // Archive current state to history
    const historyEntry = {
      id: historyId(),
      contentId: id,
      version: existing.version,
      data: JSON.stringify(existing.data),
      changeType: 'updated' as const,
      changedBy,
      changeSummary: `Updated to version ${newVersion}`,
      createdAt: now,
    }

    // Prepare updates
    const contentUpdates: Partial<Content> = {
      version: newVersion,
      updatedAt: now,
    }

    if (updates.slug !== undefined) {
      contentUpdates.slug = updates.slug
    }
    if (updates.data !== undefined) {
      contentUpdates.data = JSON.stringify(updates.data)
    }
    if (updates.status !== undefined) {
      contentUpdates.status = updates.status
    }
    if (updates.sortOrder !== undefined) {
      contentUpdates.sortOrder = updates.sortOrder
    }

    await db.batch([
      db.insert(contentHistory).values(historyEntry),
      db.update(content).set(contentUpdates).where(eq(content.id, id)),
    ])

    return this.findById(id)
  }

  async delete(id: string, changedBy?: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const now = new Date().toISOString()

    const historyEntry = {
      id: historyId(),
      contentId: id,
      version: existing.version,
      data: JSON.stringify(existing.data),
      changeType: 'deleted' as const,
      changedBy,
      changeSummary: 'Soft deleted',
      createdAt: now,
    }

    await db.batch([
      db.insert(contentHistory).values(historyEntry),
      db.update(content).set({ deletedAt: now, updatedAt: now }).where(eq(content.id, id)),
    ])

    return true
  }

  async getHistory(id: string, limit = 50, offset = 0): Promise<ContentHistory[]> {
    return db
      .select()
      .from(contentHistory)
      .where(eq(contentHistory.contentId, id))
      .orderBy(desc(contentHistory.version))
      .limit(limit)
      .offset(offset)
  }

  async restoreVersion(id: string, version: number, changedBy?: string): Promise<ContentWithData | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    // Find the history entry for the requested version
    const historyResults = await db
      .select()
      .from(contentHistory)
      .where(and(eq(contentHistory.contentId, id), eq(contentHistory.version, version)))
      .limit(1)

    if (historyResults.length === 0) return null

    const historyEntry = historyResults[0]
    const now = new Date().toISOString()
    const newVersion = existing.version + 1

    // Archive current state
    const archiveEntry = {
      id: historyId(),
      contentId: id,
      version: existing.version,
      data: JSON.stringify(existing.data),
      changeType: 'restored' as const,
      changedBy,
      changeSummary: `Restored from version ${version} to version ${newVersion}`,
      createdAt: now,
    }

    await db.batch([
      db.insert(contentHistory).values(archiveEntry),
      db
        .update(content)
        .set({
          data: historyEntry.data,
          version: newVersion,
          updatedAt: now,
        })
        .where(eq(content.id, id)),
    ])

    return this.findById(id)
  }

  async getBundle(): Promise<ContentBundle> {
    const published = await this.findPublished()

    const bundle: ContentBundle = {
      projects: [],
      experiences: [],
      education: [],
      skills: [],
      about: null,
      contact: null,
    }

    for (const item of published) {
      switch (item.type) {
        case 'project':
          bundle.projects.push(item)
          break
        case 'experience':
          bundle.experiences.push(item)
          break
        case 'education':
          bundle.education.push(item)
          break
        case 'skill':
          bundle.skills.push(item)
          break
        case 'about':
          bundle.about = item
          break
        case 'contact':
          bundle.contact = item
          break
      }
    }

    return bundle
  }
}

export const contentRepository = new ContentRepository()
