import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { registerTools } from './tools'
import { registerResources } from './resources'
import { registerPrompts } from './prompts'

const transports = new Map<string, StreamableHTTPServerTransport>()

function createMcpSession(): {
  server: McpServer
  transport: StreamableHTTPServerTransport
} {
  const server = new McpServer({
    name: 'portfolio-mcp',
    version: '1.0.0',
  })

  registerTools(server)
  registerResources(server)
  registerPrompts(server)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId: string) => {
      transports.set(sessionId, transport)
    },
  })

  transport.onclose = () => {
    const sid = transport.sessionId
    if (sid) {
      transports.delete(sid)
    }
  }

  return { server, transport }
}

export const mcpRouter = Router()

// POST -- JSON-RPC requests
mcpRouter.post('/', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined

  try {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!
      await transport.handleRequest(req, res, req.body)
      return
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const { server, transport } = createMcpSession()
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
      return
    }

    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    })
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      })
    }
  }
})

// GET -- SSE stream for server-initiated notifications
mcpRouter.get('/', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined

  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Invalid or missing session ID',
      },
      id: null,
    })
    return
  }

  const transport = transports.get(sessionId)!
  await transport.handleRequest(req, res)
})

// DELETE -- session cleanup
mcpRouter.delete('/', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined

  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Invalid or missing session ID',
      },
      id: null,
    })
    return
  }

  const transport = transports.get(sessionId)!
  await transport.handleRequest(req, res)
})
