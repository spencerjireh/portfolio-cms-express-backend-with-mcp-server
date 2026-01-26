---
title: Content Model
description: Content types, schemas, and validation rules
---

# Content Model Reference

This document defines the content types, schemas, and validation rules for the Portfolio CMS.

## Overview

All content is stored in a single `content` table with a flexible JSON `data` column. Content is categorized by `type` and optionally identified by `slug`.

```
+------------------------------------------------------------------+
|                        content table                              |
+--------+----------+----------+-----------------+--------+---------+
|   id   |   type   |   slug   |      data       | status |  ...    |
+--------+----------+----------+-----------------+--------+---------+
| uuid   | project  | my-app   | {title, desc..} | pub    |         |
| uuid   | page     | about    | {title, body..} | pub    |         |
| uuid   | list     | skills   | {items: [...]}  | pub    |         |
| uuid   | config   | site     | {name, email..} | pub    |         |
+--------+----------+----------+-----------------+--------+---------+
```

## Base Schema

All content items share these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Auto | Unique identifier |
| `type` | enum | Yes | `project`, `page`, `list`, `config` |
| `slug` | string | No | URL-friendly identifier (unique per type) |
| `data` | JSON | Yes | Type-specific content (see below) |
| `status` | enum | Yes | `draft` or `published` |
| `version` | integer | Auto | Increments on each update |
| `sortOrder` | integer | No | Display order (default: 0) |
| `createdAt` | timestamp | Auto | Creation time |
| `updatedAt` | timestamp | Auto | Last update time |
| `deletedAt` | timestamp | Auto | Soft delete time (null if active) |

### Slug Rules

- Lowercase alphanumeric with hyphens only: `^[a-z0-9-]+$`
- Maximum 100 characters
- Unique within a `type`
- Optional for `config` type (singleton patterns)

## Content Types

### Project

Represents a portfolio project (app, website, library, etc.).

**Type**: `project`
**Slug**: Required (e.g., `portfolio-backend`, `task-manager`)

#### Schema

```typescript
interface ProjectData {
  title: string          // Required, 1-200 chars
  description: string    // Required, 1-500 chars (short summary)
  content?: string       // Optional, Markdown (full details)
  tags: string[]         // Default: []
  links?: {
    github?: string      // URL
    live?: string        // URL
    demo?: string        // URL
  }
  coverImage?: string    // URL
  featured: boolean      // Default: false
}
```

#### Example

```json
{
  "type": "project",
  "slug": "portfolio-backend",
  "status": "published",
  "sortOrder": 1,
  "data": {
    "title": "Portfolio Backend",
    "description": "A TypeScript/Express backend with CMS, AI chat, and MCP integration.",
    "content": "## Overview\n\nThis project demonstrates...",
    "tags": ["typescript", "express", "sqlite", "ai"],
    "links": {
      "github": "https://github.com/user/portfolio-backend",
      "live": "https://api.myportfolio.com"
    },
    "coverImage": "https://images.myportfolio.com/portfolio-backend.png",
    "featured": true
  }
}
```

#### Validation

```typescript
const ProjectDataSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  content: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  links: z.object({
    github: z.string().url().optional(),
    live: z.string().url().optional(),
    demo: z.string().url().optional(),
  }).optional(),
  coverImage: z.string().url().optional(),
  featured: z.boolean().default(false),
})
```

### Page

Static content pages (About, Contact, etc.).

**Type**: `page`
**Slug**: Required (e.g., `about`, `contact`, `privacy`)

#### Schema

```typescript
interface PageData {
  title: string          // Required, 1-200 chars
  content: string        // Required, Markdown
  image?: string         // Optional, URL (hero image)
}
```

#### Example

```json
{
  "type": "page",
  "slug": "about",
  "status": "published",
  "data": {
    "title": "About Me",
    "content": "# Hello!\n\nI'm a software engineer based in...",
    "image": "https://images.myportfolio.com/headshot.jpg"
  }
}
```

### List: Skills

A categorized list of technical and soft skills.

**Type**: `list`
**Slug**: `skills` (singleton)

#### Schema

```typescript
interface SkillsListData {
  items: Array<{
    name: string                                    // Required
    category: 'language' | 'framework' | 'tool' | 'soft'  // Required
    icon?: string                                   // Icon name or URL
    proficiency?: 1 | 2 | 3 | 4 | 5                // Skill level
  }>
}
```

#### Example

```json
{
  "type": "list",
  "slug": "skills",
  "status": "published",
  "data": {
    "items": [
      {
        "name": "TypeScript",
        "category": "language",
        "icon": "typescript",
        "proficiency": 5
      },
      {
        "name": "React",
        "category": "framework",
        "icon": "react",
        "proficiency": 4
      },
      {
        "name": "Problem Solving",
        "category": "soft",
        "proficiency": 5
      }
    ]
  }
}
```

#### Category Definitions

| Category | Description | Examples |
|----------|-------------|----------|
| `language` | Programming languages | TypeScript, Python, Go |
| `framework` | Frameworks and libraries | React, Express, Django |
| `tool` | Development tools | Git, Docker, VS Code |
| `soft` | Soft skills | Communication, Leadership |

### List: Experience

Work experience and employment history.

**Type**: `list`
**Slug**: `experience` (singleton)

#### Schema

```typescript
interface ExperienceListData {
  items: Array<{
    company: string          // Required
    role: string             // Required
    description?: string     // Job description/achievements
    startDate: string        // Required, format: YYYY-MM
    endDate: string | null   // null = current position
    location?: string        // City, Country or "Remote"
    type?: 'full-time' | 'part-time' | 'contract' | 'freelance'
    skills: string[]         // Technologies used
  }>
}
```

#### Example

```json
{
  "type": "list",
  "slug": "experience",
  "status": "published",
  "data": {
    "items": [
      {
        "company": "Tech Corp",
        "role": "Senior Software Engineer",
        "description": "Led development of microservices platform...",
        "startDate": "2022-06",
        "endDate": null,
        "location": "San Francisco, CA",
        "type": "full-time",
        "skills": ["TypeScript", "Kubernetes", "PostgreSQL"]
      }
    ]
  }
}
```

### List: Education

Educational background.

**Type**: `list`
**Slug**: `education` (singleton)

#### Schema

```typescript
interface EducationListData {
  items: Array<{
    institution: string      // Required
    degree: string           // Required (e.g., "B.S. Computer Science")
    field?: string           // Field of study
    startDate: string        // Format: YYYY-MM
    endDate: string | null   // null = in progress
    location?: string
    gpa?: string             // Optional (e.g., "3.8/4.0")
    highlights?: string[]    // Achievements, activities
  }>
}
```

### Config: Site

Global site configuration.

**Type**: `config`
**Slug**: `site` (singleton)

#### Schema

```typescript
interface SiteConfigData {
  name: string              // Required, portfolio owner name
  title: string             // Required, job title/tagline
  email: string             // Required, contact email
  social: Record<string, string>  // Platform -> URL mapping
  chatEnabled: boolean      // Default: true
  chatSystemPrompt?: string // Custom system prompt for AI chat
}
```

#### Example

```json
{
  "type": "config",
  "slug": "site",
  "status": "published",
  "data": {
    "name": "Jane Developer",
    "title": "Full Stack Engineer",
    "email": "jane@example.com",
    "social": {
      "github": "https://github.com/janedev",
      "linkedin": "https://linkedin.com/in/janedev",
      "twitter": "https://twitter.com/janedev"
    },
    "chatEnabled": true,
    "chatSystemPrompt": "You are a helpful assistant representing Jane's portfolio..."
  }
}
```

## Content Bundle

The `/api/v1/content/bundle` endpoint returns all published content organized for frontend consumption:

```typescript
interface ContentBundle {
  projects: Project[]       // Sorted by sortOrder, then createdAt
  pages: Page[]             // Sorted by sortOrder
  skills: Skill[]           // From list/skills
  experience: Experience[]  // From list/experience, sorted by startDate desc
  education: Education[]    // From list/education, sorted by startDate desc
  config: SiteConfig        // From config/site
}
```

## Versioning

Every content update creates a history record:

| Field | Description |
|-------|-------------|
| `contentId` | Reference to content item |
| `version` | Version number at time of snapshot |
| `data` | Complete data JSON at that version |
| `changeType` | `create`, `update`, `delete`, `restore` |
| `changedBy` | Identifier of who made the change |
| `changeSummary` | Auto-generated description of changes |
| `createdAt` | When this version was created |

### Version Operations

**Get history:**
```
GET /api/v1/admin/content/:id/history
```

**Restore version:**
```
POST /api/v1/admin/content/:id/restore
Body: { "version": 3 }
```

**Compare versions:**
```
GET /api/v1/admin/content/:id/diff?from=2&to=5
```

## Validation Summary

| Type | Slug | Required Fields | Optional Fields |
|------|------|-----------------|-----------------|
| `project` | Yes | title, description | content, tags, links, coverImage, featured |
| `page` | Yes | title, content | image |
| `list` (skills) | `skills` | items[].name, items[].category | items[].icon, items[].proficiency |
| `list` (experience) | `experience` | items[].company, items[].role, items[].startDate | items[].description, items[].endDate, etc. |
| `list` (education) | `education` | items[].institution, items[].degree, items[].startDate | items[].field, items[].endDate, etc. |
| `config` (site) | `site` | name, title, email, social | chatEnabled, chatSystemPrompt |

## Best Practices

### Content Organization

1. **Use meaningful slugs**: `portfolio-backend` not `project-1`
2. **Set sortOrder**: Control display order explicitly
3. **Keep descriptions concise**: Full content goes in `content` field
4. **Tag consistently**: Use lowercase, hyphenated tags

### Markdown Content

- Use standard Markdown (CommonMark)
- Images should be absolute URLs
- Code blocks with language hints: ` ```typescript `
- Keep headings hierarchical (don't skip levels)

### Lists

- Order items logically (skills by proficiency, experience by date)
- Use consistent date formats (YYYY-MM)
- Null `endDate` = current position
