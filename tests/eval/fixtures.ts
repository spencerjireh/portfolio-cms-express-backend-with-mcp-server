/**
 * Fixtures and seed data for LLM evaluations.
 * Based on test-factories.ts pattern.
 */

export const EVAL_SESSION_PREFIX = 'eval-'
export const EVAL_CONTENT_PREFIX = 'content_eval_'

interface SeedContent {
  id: string
  type: string
  slug: string
  data: Record<string, unknown>
  status: string
  version: number
  sortOrder: number
}

/**
 * Creates a seed project for evaluation.
 */
export function createSeedProject(overrides: Partial<SeedContent> = {}): SeedContent {
  return {
    id: `${EVAL_CONTENT_PREFIX}project`,
    type: 'project',
    slug: 'portfolio-backend',
    data: {
      title: 'Portfolio Backend',
      description:
        'A TypeScript/Express backend application featuring a RESTful API, AI-powered chat, and content management system.',
      content:
        'This portfolio backend is built with TypeScript and Express.js. It includes Redis caching, Turso/SQLite database, OpenAI integration for chat functionality, and comprehensive API endpoints for managing portfolio content.',
      tags: ['TypeScript', 'Express', 'Redis', 'SQLite', 'OpenAI'],
      links: {
        github: 'https://github.com/spencer/portfolio-backend',
        live: 'https://api.portfolio.dev',
      },
      featured: true,
    },
    status: 'published',
    version: 1,
    sortOrder: 0,
    ...overrides,
  }
}

/**
 * Creates a seed experience for evaluation.
 */
export function createSeedExperience(overrides: Partial<SeedContent> = {}): SeedContent {
  return {
    id: `${EVAL_CONTENT_PREFIX}experience`,
    type: 'experience',
    slug: 'experience',
    data: {
      items: [
        {
          company: 'TechCorp Inc',
          role: 'Senior Software Engineer',
          description:
            'Led development of microservices architecture. Built scalable APIs serving 1M+ requests daily. Mentored junior developers and conducted code reviews.',
          startDate: '2021-03',
          endDate: null,
          location: 'San Francisco, CA',
          type: 'full-time',
          skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'AWS'],
        },
        {
          company: 'StartupXYZ',
          role: 'Full Stack Developer',
          description:
            'Developed React frontend and Node.js backend for e-commerce platform. Implemented payment processing and inventory management.',
          startDate: '2019-06',
          endDate: '2021-02',
          location: 'Remote',
          type: 'full-time',
          skills: ['React', 'Node.js', 'MongoDB', 'Stripe'],
        },
      ],
    },
    status: 'published',
    version: 1,
    sortOrder: 0,
    ...overrides,
  }
}

/**
 * Creates seed skills for evaluation.
 */
export function createSeedSkill(overrides: Partial<SeedContent> = {}): SeedContent {
  return {
    id: `${EVAL_CONTENT_PREFIX}skills`,
    type: 'skill',
    slug: 'skills',
    data: {
      items: [
        { name: 'TypeScript', category: 'language', proficiency: 5 },
        { name: 'JavaScript', category: 'language', proficiency: 5 },
        { name: 'Python', category: 'language', proficiency: 4 },
        { name: 'Node.js', category: 'runtime', proficiency: 5 },
        { name: 'React', category: 'framework', proficiency: 5 },
        { name: 'Express', category: 'framework', proficiency: 5 },
        { name: 'PostgreSQL', category: 'database', proficiency: 4 },
        { name: 'Redis', category: 'database', proficiency: 4 },
        { name: 'AWS', category: 'cloud', proficiency: 4 },
        { name: 'Docker', category: 'devops', proficiency: 4 },
      ],
    },
    status: 'published',
    version: 1,
    sortOrder: 0,
    ...overrides,
  }
}

/**
 * Creates seed about content for evaluation.
 */
export function createSeedAbout(overrides: Partial<SeedContent> = {}): SeedContent {
  return {
    id: `${EVAL_CONTENT_PREFIX}about`,
    type: 'about',
    slug: 'about',
    data: {
      title: 'About Spencer',
      content:
        'Spencer is a passionate software engineer with over 5 years of experience building web applications and distributed systems. Specializing in TypeScript and cloud technologies, Spencer enjoys solving complex problems and mentoring other developers.',
    },
    status: 'published',
    version: 1,
    sortOrder: 0,
    ...overrides,
  }
}

/**
 * Default seed data for evaluations.
 */
export const defaultSeed = {
  projects: [createSeedProject()],
  experiences: [createSeedExperience()],
  skills: [createSeedSkill()],
  about: [createSeedAbout()],
}

/**
 * Ground truth statements for accuracy evaluation.
 * These must match the seed data above.
 */
export const groundTruths = {
  projectDescription:
    'Portfolio Backend is a TypeScript/Express backend application with RESTful API, AI-powered chat, Redis caching, and Turso/SQLite database.',
  experience:
    'Spencer works as a Senior Software Engineer at TechCorp Inc since March 2021, leading microservices development and building scalable APIs. Previously worked at StartupXYZ as a Full Stack Developer.',
  skills:
    'Spencer is proficient in TypeScript, JavaScript, Python, Node.js, React, Express, PostgreSQL, Redis, AWS, and Docker.',
  about:
    'Spencer is a software engineer with over 5 years of experience, specializing in TypeScript and cloud technologies.',
}

/**
 * Gets all seed content as a flat array.
 */
export function getAllSeedContent(): SeedContent[] {
  return [
    ...defaultSeed.projects,
    ...defaultSeed.experiences,
    ...defaultSeed.skills,
    ...defaultSeed.about,
  ]
}
