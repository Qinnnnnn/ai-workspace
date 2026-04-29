import Docker from 'dockerode'
import { PassThrough } from 'stream'

const DOCKER_IMAGE = process.env.SANDBOX_DOCKER_IMAGE ?? 'codenano-sandbox:latest'
const CONTAINER_CPU_LIMIT = parseFloat(process.env.SANDBOX_CPU_LIMIT ?? '0.5')

const DEFAULT_TCP_HOST = process.env.DOCKER_TCP_HOST ?? '127.0.0.1'
const DEFAULT_TCP_PORT = parseInt(process.env.DOCKER_TCP_PORT ?? '2375', 10)
const DEFAULT_TIMEOUT_MS = 30_000

// Singleton: reuse HTTP agent and connection pool
const docker = new Docker({
  host: DEFAULT_TCP_HOST,
  port: DEFAULT_TCP_PORT,
  protocol: 'http',
})

export async function checkDockerHealth(): Promise<boolean> {
  try {
    await docker.ping()
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Docker health check failed:', message)
    console.error('Ensure Docker daemon is listening on TCP:', `tcp://${DEFAULT_TCP_HOST}:${DEFAULT_TCP_PORT}`)
    return false
  }
}

export async function pullImage(image: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err)
      docker.modem.followProgress(stream, (progressErr: Error | null) => {
        if (progressErr) reject(progressErr)
        else resolve()
      })
    })
  })
}

export async function createContainer(sessionId: string): Promise<string> {
  const containerName = `codenano-sandbox-${sessionId}`

  try {
    await docker.getImage(DOCKER_IMAGE).inspect()
  } catch {
    await pullImage(DOCKER_IMAGE)
  }

  const containerOptions: Docker.ContainerCreateOptions = {
    name: containerName,
    Image: DOCKER_IMAGE,
    Cmd: ['tail', '-f', '/dev/null'],
    WorkingDir: '/workspace',
    HostConfig: {
      Mounts: [{
        Type: 'tmpfs',
        Target: '/workspace',
        TmpfsOptions: {
          SizeBytes: 512 * 1024 * 1024,
          Mode: 0o777,
        },
      }] as Docker.MountSettings[],
      NanoCpus: Math.floor(CONTAINER_CPU_LIMIT * 1e9),
      Memory: 512 * 1024 * 1024,
      MemorySwap: 512 * 1024 * 1024,
      CapDrop: ['ALL'],
      Privileged: false,
    },
    Volumes: { '/workspace': {} },
  }

  const containerInfo = await docker.createContainer(containerOptions)
  return containerInfo.id
}

export async function startContainer(containerId: string): Promise<void> {
  await docker.getContainer(containerId).start()
}

export async function stopContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId)
  try {
    await container.stop({ t: 10 })
    await container.remove({ force: true })
  } catch {
    // Container may already be stopped or removed
  }
}

export interface ExecResult {
  status: number
  stdout: string
  stderr: string
}

async function runCommandInternal(
  containerId: string,
  command: string,
  input?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecResult> {
  const container = docker.getContainer(containerId)
  const hasStdin = input !== undefined

  const exec = await container.exec({
    Cmd: ['bash', '-c', command],
    AttachStdin: hasStdin,
    AttachStdout: true,
    AttachStderr: true,
  })

  const stream = await exec.start({ hijack: true, stdin: hasStdin })

  // Use DockerODE's built-in demuxStream to handle multiplexed protocol correctly,
  // including DockerODE's anomaly where stream type 1 is used for stdout when stdin is not attached.
  const stdoutStream = new PassThrough()
  const stderrStream = new PassThrough()
  docker.modem.demuxStream(stream, stdoutStream, stderrStream)

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []
  stdoutStream.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
  stderrStream.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

  if (hasStdin) {
    stream.write(input)
    stream.end()
  }

  return new Promise((resolve, reject) => {
    let settled = false

    const timeoutTimer = setTimeout(() => {
      if (settled) return
      settled = true
      stream.destroy()
      reject(new Error(`Command execution timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    stream.on('end', async () => {
      if (settled) return
      settled = true
      clearTimeout(timeoutTimer)
      const info = await exec.inspect()
      resolve({
        status: info.ExitCode ?? 0,
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
      })
    })

    stream.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutTimer)
      reject(err)
    })
  })
}

export async function execCommand(
  containerId: string,
  command: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecResult> {
  return runCommandInternal(containerId, command, undefined, timeout)
}

export async function execCommandWithStdin(
  containerId: string,
  command: string,
  input: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecResult> {
  return runCommandInternal(containerId, command, input, timeout)
}

export async function execDetached(
  containerId: string,
  command: string,
): Promise<void> {
  const container = docker.getContainer(containerId)
  const exec = await container.exec({
    Cmd: ['bash', '-c', command],
  })
  await exec.start({ Detach: true })
}
