import Docker from 'dockerode'

const DOCKER_IMAGE = process.env.SANDBOX_DOCKER_IMAGE ?? 'codenano-sandbox:latest'
const CONTAINER_CPU_LIMIT = parseFloat(process.env.SANDBOX_CPU_LIMIT ?? '0.5')

const DEFAULT_TCP_HOST = process.env.DOCKER_TCP_HOST ?? '127.0.0.1'
const DEFAULT_TCP_PORT = parseInt(process.env.DOCKER_TCP_PORT ?? '2375', 10)

function getDocker(): Docker {
  return new Docker({
    host: DEFAULT_TCP_HOST,
    port: DEFAULT_TCP_PORT,
    protocol: 'http',
  })
}

export async function checkDockerHealth(): Promise<boolean> {
  try {
    const docker = getDocker()
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
  const docker = getDocker()
  await new Promise<void>((resolve, reject) => {
    docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) {
        reject(err)
        return
      }
      docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

export async function createContainer(
  sessionId: string,
): Promise<string> {
  const docker = getDocker()
  const containerName = `codenano-sandbox-${sessionId}`

  try {
    await docker.getImage(DOCKER_IMAGE).inspect()
  } catch {
    await pullImage(DOCKER_IMAGE)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerInfo = await docker.createContainer({
    name: containerName,
    Image: DOCKER_IMAGE,
    Cmd: ['tail', '-f', '/dev/null'],
    WorkingDir: '/workspace',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HostConfig: {
      Mounts: [{
        Type: 'tmpfs',
        Target: '/workspace',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        TmpfsOptions: { SizeBytes: 512 * 1024 * 1024, Mode: 0o777 } as any,
      }],
      NanoCpus: Math.floor(CONTAINER_CPU_LIMIT * 1e9),
      CapDrop: ['ALL'],
      Privileged: false,
    },
    Volumes: { '/workspace': {} },
  } as any)

  return (containerInfo as any).id
}

export async function startContainer(containerId: string): Promise<void> {
  const docker = getDocker()
  const container = docker.getContainer(containerId)
  await container.start()
}

export async function stopContainer(containerId: string): Promise<void> {
  const docker = getDocker()
  const container = docker.getContainer(containerId)
  try {
    await container.stop({ t: 10 })
    await container.remove({ force: true })
  } catch {
    // Container may already be stopped or removed
  }
}

const DEFAULT_TIMEOUT_MS = 30_000

export interface ExecResult {
  status: number
  stdout: string
  stderr: string
}

function parseExecStream(chunk: Buffer, stdout: string[], stderr: string[]): void {
  // Docker exec protocol: 8-byte header followed by payload
  // Header: [stream_type(1), 0, 0, 0, size(4 bytes big-endian)]
  // Stream type: 1=stdin, 2=stdout, 4=stderr
  let offset = 0
  while (offset < chunk.length) {
    if (offset + 8 > chunk.length) break
    const streamType = chunk[offset]
    const size = chunk.readUInt32BE(offset + 4)
    offset += 8
    if (offset + size > chunk.length) break
    const data = chunk.slice(offset, offset + size).toString()
    if (streamType === 2) {
      stdout.push(data)
    } else if (streamType === 4) {
      stderr.push(data)
    }
    offset += size
  }
}

export async function execCommand(
  containerId: string,
  command: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecResult> {
  const docker = getDocker()
  const container = docker.getContainer(containerId)

  const exec = await container.exec({
    Cmd: ['bash', '-c', command],
    AttachStdout: true,
    AttachStderr: true,
  })

  const stream = await exec.start({ hijack: true, stdin: false })

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  const { setTimeout: setTimeoutFn } = await import('timers/promises')

  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        stream.on('data', (chunk: Buffer) => {
          parseExecStream(chunk, stdoutChunks, stderrChunks)
        })
        stream.on('end', () => resolve())
      }),
      setTimeoutFn(timeout),
    ])
  } catch {
    // timeout - stream will be closed
  }

  const info = await exec.inspect()
  return {
    status: info.ExitCode ?? 0,
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
  }
}

export async function execCommandWithStdin(
  containerId: string,
  command: string,
  input: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecResult> {
  const docker = getDocker()
  const container = docker.getContainer(containerId)

  const exec = await container.exec({
    Cmd: ['bash', '-c', command],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
  })

  const stream = await exec.start({ hijack: true, stdin: true })

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  const { setTimeout: setTimeoutFn } = await import('timers/promises')

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Stdin write timeout'))
    }, 10000)

    stream.write(input, (err?: Error | null) => {
      clearTimeout(timeoutId)
      if (err) {
        reject(err)
        return
      }
      stream.end((err?: Error | null) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        stream.on('data', (chunk: Buffer) => {
          parseExecStream(chunk, stdoutChunks, stderrChunks)
        })
        stream.on('end', () => resolve())
      }),
      setTimeoutFn(timeout),
    ])
  } catch {
    // timeout - stream will be closed
  }

  const info = await exec.inspect()
  return {
    status: info.ExitCode ?? 0,
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
  }
}

export async function execDetached(
  containerId: string,
  command: string,
): Promise<void> {
  const docker = getDocker()
  const container = docker.getContainer(containerId)

  const exec = await container.exec({
    Cmd: ['bash', '-c', command],
  })

  await exec.start({ Detach: true })
}
