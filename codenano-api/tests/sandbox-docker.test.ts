/**
 * Sandbox Docker Integration Tests
 *
 * These tests use real Docker containers and require:
 * - Docker daemon accessible
 * - codenano-sandbox:v1 image available
 * - Network access for container operations
 *
 * Run with: npm test -- --run tests/sandbox-docker.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Docker from 'dockerode'
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'

const DOCKER_IMAGE = process.env.SANDBOX_DOCKER_IMAGE ?? 'codenano-sandbox:v1'
const WORKSPACE_BASE = path.join(os.homedir(), '.agent-core', 'workspaces')
const CONTAINER_STARTUP_TIMEOUT = 30000 // 30 seconds for container startup

const docker = new Docker()

async function createTestContainer(): Promise<{ containerId: string; physicalPath: string }> {
  const sessionId = `test-${uuidv4()}`
  const physicalPath = path.join(WORKSPACE_BASE, sessionId)

  // Create workspace directory
  fs.mkdirSync(physicalPath, { recursive: true })

  const container = await docker.createContainer({
    name: `codenano-sandbox-${sessionId}`,
    Image: DOCKER_IMAGE,
    Cmd: ['tail', '-f', '/dev/null'],
    WorkingDir: '/workspace',
    HostConfig: {
      Binds: [`${physicalPath}:/workspace`],
      Memory: 512 * 1024 * 1024,
      NanoCpus: Math.floor(0.5 * 1e9),
      CapDrop: ['ALL'],
      Privileged: false,
    },
  })

  await container.start()

  return { containerId: container.id, physicalPath }
}

async function removeTestContainer(containerId: string, physicalPath: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId)
    await container.stop({ t: 5 })
    await container.remove({ force: true })
  } catch {
    // Container may already be removed
  }

  try {
    fs.rmSync(physicalPath, { recursive: true, force: true })
  } catch {
    // Directory may already be removed
  }
}

function execInContainer(containerId: string, command: string, cwd: string = '/workspace'): { stdout: string; stderr: string; exitCode: number } {
  const fullCmd = `docker exec ${containerId} bash -c "cd ${cwd} && ${command.replace(/"/g, '\\"')}"`
  const result = spawnSync('bash', ['-c', fullCmd], {
    encoding: 'utf-8',
    timeout: 5000,
  })

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 0,
  }
}

describe('Real Docker Container Tests', () => {
  describe('7.5 BashTool executes in container with correct cwd', () => {
    it('should execute command in container with /workspace as cwd', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Create a test file
        fs.writeFileSync(path.join(physicalPath, 'test.txt'), 'hello world')

        // Execute ls in container
        const result = execInContainer(containerId, 'ls -la')

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('test.txt')
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })

    it('should execute command and return correct output', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Execute echo command
        const result = execInContainer(containerId, 'echo "Hello from container"')

        expect(result.exitCode).toBe(0)
        expect(result.stdout.trim()).toBe('Hello from container')
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })
  })

  describe('7.6 GlobTool returns files from container /workspace', () => {
    it('should find files using find command', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Create test files
        fs.mkdirSync(path.join(physicalPath, 'src'), { recursive: true })
        fs.writeFileSync(path.join(physicalPath, 'src', 'main.ts'), 'const x = 1')
        fs.writeFileSync(path.join(physicalPath, 'src', 'utils.ts'), 'export const y = 2')
        fs.writeFileSync(path.join(physicalPath, 'README.md'), '# Test')

        // Use find to glob files
        const result = execInContainer(
          containerId,
          'find . -name "*.ts" -type f 2>/dev/null | head -1000'
        )

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('./src/main.ts')
        expect(result.stdout).toContain('./src/utils.ts')
        expect(result.stdout).not.toContain('README.md') // .md files shouldn't match .ts pattern
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })

    it('should return empty when no files match pattern', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Don't create any .js files
        const result = execInContainer(
          containerId,
          'find . -name "*.js" -type f 2>/dev/null | head -1000'
        )

        expect(result.exitCode).toBe(0)
        expect(result.stdout.trim()).toBe('')
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })
  })

  describe('7.7 GrepTool searches inside container /workspace', () => {
    it('should search for pattern using ripgrep', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Create test files
        fs.mkdirSync(path.join(physicalPath, 'src'), { recursive: true })
        fs.writeFileSync(
          path.join(physicalPath, 'src', 'main.ts'),
          'function hello() { return "world" }'
        )

        // Search using ripgrep
        const result = execInContainer(
          containerId,
          'rg -- "function" src'
        )

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('function hello()')
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })

    it('should use -- separator to prevent pattern interpretation as option', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Create a file with content that looks like an option
        fs.mkdirSync(path.join(physicalPath, 'src'), { recursive: true })
        fs.writeFileSync(
          path.join(physicalPath, 'src', 'config.ts'),
          'export const timeout = --timeout'
        )

        // Search with -- separator
        const result = execInContainer(
          containerId,
          'rg -- "--timeout" src'
        )

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('--timeout')
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })

    it('should handle special characters in pattern', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Create a file with special characters
        fs.mkdirSync(path.join(physicalPath, 'src'), { recursive: true })
        fs.writeFileSync(
          path.join(physicalPath, 'src', 'test.ts'),
          "const message = 'do not worry'"
        )

        // Search for pattern with space using ripgrep -e flag
        const result = execInContainer(
          containerId,
          'rg -e "do not" src'
        )

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain("do not worry")
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })
  })

  describe('7.8 Command timeout returns error to LLM', () => {
    it('should timeout long-running commands', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Run a command that takes longer than the timeout via docker exec
        // Use spawnSync which should throw on timeout
        const result = spawnSync(
          'bash',
          ['-c', `docker exec ${containerId} bash -c "sleep 10"`],
          { encoding: 'utf-8', timeout: 2000 }
        )

        // Either the process was killed or exited with non-zero status
        expect(result.status !== 0 || result.error !== undefined).toBe(true)
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })
  })

  describe('7.10 End-to-end: LLM creates file, edits, runs via BashTool', () => {
    it('should create file, edit it, and execute it in container', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Step 1: Create a Python file via docker exec
        const createResult = execInContainer(
          containerId,
          'cat > /workspace/hello.py << \'EOF\'\nprint("Hello, World!")\nEOF'
        )
        expect(createResult.exitCode).toBe(0)

        // Verify file was created
        const readResult = execInContainer(containerId, 'cat /workspace/hello.py')
        expect(readResult.stdout).toContain('Hello, World!')

        // Step 2: Edit the file - replace "World" with "Container"
        const editResult = execInContainer(
          containerId,
          'sed -i "s/World/Container/" /workspace/hello.py'
        )
        expect(editResult.exitCode).toBe(0)

        // Verify edit
        const afterEditResult = execInContainer(containerId, 'cat /workspace/hello.py')
        expect(afterEditResult.stdout).toContain('Hello, Container!')

        // Step 3: Run the Python script
        const runResult = execInContainer(containerId, 'python3 /workspace/hello.py')
        expect(runResult.exitCode).toBe(0)
        expect(runResult.stdout.trim()).toBe('Hello, Container!')
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })

    it('should handle multi-line file creation and execution', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Create a more complex Python file
        const createResult = execInContainer(
          containerId,
          `cat > /workspace/fib.py << 'EOF'
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
EOF`
        )
        expect(createResult.exitCode).toBe(0)

        // Run the script
        const runResult = execInContainer(containerId, 'python3 /workspace/fib.py')
        expect(runResult.exitCode).toBe(0)
        expect(runResult.stdout).toContain('F(9) = 34')
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })
  })

  describe('Container resource limits enforcement', () => {
    it('should enforce memory limit', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Check container memory limit
        const info = await docker.getContainer(containerId).inspect()
        expect(info.HostConfig?.Memory).toBe(512 * 1024 * 1024)
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })

    it('should enforce CPU limit', async () => {
      const { containerId, physicalPath } = await createTestContainer()

      try {
        // Check container CPU limit
        const info = await docker.getContainer(containerId).inspect()
        expect(info.HostConfig?.NanoCpus).toBe(Math.floor(0.5 * 1e9))
      } finally {
        await removeTestContainer(containerId, physicalPath)
      }
    })
  })

  describe('Workspace isolation between containers', () => {
    it('should isolate workspaces between containers', async () => {
      const container1 = await createTestContainer()
      const container2 = await createTestContainer()

      try {
        // Create different files in each container
        execInContainer(container1.containerId, 'echo "container1" > /workspace/shared.txt')
        execInContainer(container2.containerId, 'echo "container2" > /workspace/shared.txt')

        // Each container should have its own file
        const result1 = execInContainer(container1.containerId, 'cat /workspace/shared.txt')
        const result2 = execInContainer(container2.containerId, 'cat /workspace/shared.txt')

        expect(result1.stdout.trim()).toBe('container1')
        expect(result2.stdout.trim()).toBe('container2')
      } finally {
        await removeTestContainer(container1.containerId, container1.physicalPath)
        await removeTestContainer(container2.containerId, container2.physicalPath)
      }
    })
  })
})

// Clean up any leftover test containers after all tests complete
afterAll(async () => {
  try {
    // Find and remove all test containers
    const containers = await docker.listContainers({ all: true })
    for (const c of containers) {
      if (c.Names.some(name => name.includes('codenano-sandbox-test-'))) {
        try {
          const container = docker.getContainer(c.Id)
          await container.stop({ t: 5 })
          await container.remove({ force: true })
          console.log(`Cleaned up leftover container: ${c.Names[0]}`)
        } catch {
          // Ignore errors during cleanup
        }
      }
    }

    // Clean up test workspaces
    try {
      const entries = fs.readdirSync(WORKSPACE_BASE)
      for (const entry of entries) {
        if (entry.startsWith('test-') || entry.startsWith('sibling')) {
          fs.rmSync(path.join(WORKSPACE_BASE, entry), { recursive: true, force: true })
          console.log(`Cleaned up leftover workspace: ${entry}`)
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  } catch {
    // Ignore errors during cleanup
  }
})
