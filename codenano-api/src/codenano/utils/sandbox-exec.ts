/**
 * sandbox-exec — Unified docker exec executor for sandbox tools.
 *
 * Routes all docker exec calls through SSH or local socket based on SANDBOX_MODE.
 * This is the single source of truth for all child process spawning in sandbox tools.
 */

import { spawnSync, SpawnSyncReturns } from 'child_process'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_BUFFER_BYTES = 50 * 1024 * 1024 // 50MB

function getSpawnEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  if (process.env.SANDBOX_MODE === 'remote') {
    const host = process.env.DOCKER_HOST_HOST
    const user = process.env.DOCKER_HOST_USER
    if (!host || !user) {
      throw new Error('SANDBOX_MODE=remote but DOCKER_HOST_HOST or DOCKER_HOST_USER is not set')
    }
    env.DOCKER_HOST = `ssh://${user}@${host}`
  }
  return env
}

/**
 * Execute a command inside a sandbox container via docker exec.
 * Routes through SSH if SANDBOX_MODE=remote, otherwise uses local socket.
 */
export function executeCoreCommand(
  containerId: string,
  command: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): SpawnSyncReturns<string> {
  const env = getSpawnEnv()
  return spawnSync(
    'docker',
    ['exec', containerId, 'bash', '-c', command],
    {
      env,
      timeout,
      encoding: 'utf-8',
      maxBuffer: MAX_BUFFER_BYTES,
    },
  )
}

/**
 * Execute a command with stdin input (for file writes).
 * Uses docker exec -i to keep stdin open.
 */
export function executeStdinCommand(
  containerId: string,
  command: string,
  input: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): SpawnSyncReturns<string> {
  const env = getSpawnEnv()
  return spawnSync(
    'docker',
    ['exec', '-i', containerId, 'bash', '-c', command],
    {
      env,
      input,
      timeout,
      encoding: 'utf-8',
      maxBuffer: MAX_BUFFER_BYTES,
    },
  )
}
