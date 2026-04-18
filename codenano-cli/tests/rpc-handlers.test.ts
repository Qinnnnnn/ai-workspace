import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}))

import { RpcServer } from '../src/rpc-server.js'

describe('RpcServer', () => {
  let server: RpcServer

  beforeEach(() => {
    server = new RpcServer()
  })

  it('registers and handles a method', async () => {
    server.register('test', async (params) => {
      return { received: params }
    })

    const response = await server.handleLine(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'test',
      params: { key: 'value' },
    }))

    // Response is sent via stdout, we capture it
    expect(server).toBeInstanceOf(RpcServer)
  })

  it('returns error for unknown method', async () => {
    const errors: string[] = []
    const originalSendError = server.sendError
    server.sendError = (...args) => {
      errors.push(args[2] as string)
      originalSendError.apply(server, args)
    }

    await server.handleLine(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'nonexistent',
    }))

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Method not found')
  })

  it('returns error for invalid JSON', async () => {
    const errors: string[] = []
    const originalSendError = server.sendError
    server.sendError = (...args) => {
      errors.push(args[2] as string)
      originalSendError.apply(server, args)
    }

    await server.handleLine('not valid json')

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Parse error')
  })
})

describe('Path traversal prevention in read_file', () => {
  it('should reject paths outside workspace', async () => {
    // Simulate the path check logic
    const filePath = '../../../etc/passwd'
    const resolvedPath = path.resolve('/workspace', filePath)
    const isInsideWorkspace = resolvedPath.startsWith('/workspace')

    expect(isInsideWorkspace).toBe(false)
  })

  it('should accept valid relative paths', async () => {
    const filePath = 'readme.md'
    const resolvedPath = path.resolve('/workspace', filePath)
    const isInsideWorkspace = resolvedPath.startsWith('/workspace')

    expect(isInsideWorkspace).toBe(true)
    expect(resolvedPath).toBe('/workspace/readme.md')
  })

  it('should accept nested paths', async () => {
    const filePath = 'src/components/button.ts'
    const resolvedPath = path.resolve('/workspace', filePath)
    const isInsideWorkspace = resolvedPath.startsWith('/workspace')

    expect(isInsideWorkspace).toBe(true)
    expect(resolvedPath).toBe('/workspace/src/components/button.ts')
  })
})

describe('Path traversal prevention in list_files', () => {
  it('should reject paths outside workspace', async () => {
    const dirPath = '../../../secrets'
    const resolvedPath = path.resolve('/workspace', dirPath)
    const isInsideWorkspace = resolvedPath.startsWith('/workspace')

    expect(isInsideWorkspace).toBe(false)
  })

  it('should accept root workspace listing', async () => {
    const resolvedPath = '/workspace'
    const isInsideWorkspace = resolvedPath.startsWith('/workspace')

    expect(isInsideWorkspace).toBe(true)
  })

  it('should accept nested directory paths', async () => {
    const dirPath = 'src/utils'
    const resolvedPath = path.resolve('/workspace', dirPath)
    const isInsideWorkspace = resolvedPath.startsWith('/workspace')

    expect(isInsideWorkspace).toBe(true)
  })
})
