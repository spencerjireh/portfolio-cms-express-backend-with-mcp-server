import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Portfolio Backend',
  description: 'Architecture and API documentation for the Portfolio Backend',
  base: '/portfolio-cms-express-backend-with-mcp-server/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'API', link: '/api/' },
      { text: 'Integrations', link: '/integrations/' },
      { text: 'Operations', link: '/operations/' },
      { text: 'Decisions', link: '/decisions/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Configuration', link: '/guide/configuration' }
          ]
        }
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/' },
            { text: 'High-Level Design', link: '/architecture/high-level-design' },
            { text: 'Low-Level Design', link: '/architecture/low-level-design' },
            { text: 'Content Model', link: '/architecture/content-model' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Reference', link: '/api/reference' }
          ]
        }
      ],
      '/integrations/': [
        {
          text: 'Integrations',
          items: [
            { text: 'Overview', link: '/integrations/' },
            { text: 'MCP Server', link: '/integrations/mcp-server' },
            { text: 'Chat Tools', link: '/integrations/chat-tools' },
            { text: 'Frontend', link: '/integrations/frontend' }
          ]
        }
      ],
      '/operations/': [
        {
          text: 'Operations',
          items: [
            { text: 'Overview', link: '/operations/' },
            { text: 'Runbook', link: '/operations/runbook' },
            { text: 'Deployment', link: '/operations/deployment' }
          ]
        }
      ],
      '/decisions/': [
        {
          text: 'Architecture Decisions',
          items: [
            { text: 'Overview', link: '/decisions/' },
            { text: 'ADR-001: Database Choice', link: '/decisions/001-database-choice' },
            { text: 'ADR-002: Caching Strategy', link: '/decisions/002-caching-strategy' },
            { text: 'ADR-003: LLM Abstraction', link: '/decisions/003-llm-abstraction' },
            { text: 'ADR-004: Repository Pattern', link: '/decisions/004-repository-pattern' },
            { text: 'ADR-005: Observability', link: '/decisions/005-observability' },
            { text: 'ADR-006: PII Obfuscation', link: '/decisions/006-pii-obfuscation' },
            { text: 'ADR-007: Content Model', link: '/decisions/007-content-model-flexibility' },
            { text: 'ADR-008: Shared Tools', link: '/decisions/008-shared-tools-architecture' }
          ]
        }
      ]
    },

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/spencerjirehcebrian/portfolio-cms-express-backend-with-mcp-server' }
    ],

    editLink: {
      pattern: 'https://github.com/spencerjirehcebrian/portfolio-cms-express-backend-with-mcp-server/edit/main/docs-site/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026'
    }
  }
})
