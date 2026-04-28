import Docker from 'dockerode'
import fs from 'fs'

const DOCKER_IMAGE = process.env.SANDBOX_DOCKER_IMAGE ?? 'codenano-sandbox:latest'
const CONTAINER_CPU_LIMIT = parseFloat(process.env.SANDBOX_CPU_LIMIT ?? '0.5')
const SANDBOX_MODE = process.env.SANDBOX_MODE ?? 'local'

function getDocker(): Docker {
  if (SANDBOX_MODE === 'remote') {
    const host = process.env.DOCKER_HOST_HOST
    const user = process.env.DOCKER_HOST_USER
    const keyPath = process.env.DOCKER_HOST_KEY_PATH
    if (!host || !user || !keyPath) {
      throw new Error('SANDBOX_MODE=remote requires DOCKER_HOST_HOST, DOCKER_HOST_USER, and DOCKER_HOST_KEY_PATH')
    }
    return new Docker({
      ssh: {
        host,
        port: 22,
        username: user,
        privateKey: fs.readFileSync(keyPath, 'utf-8'),
      },
    } as any)
  }
  // local mode: use default socket
  return new Docker()
}

export async function checkDockerHealth(): Promise<boolean> {
  try {
    const docker = getDocker()
    await docker.ping()
    return true
  } catch {
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

  // Ensure image exists, pull if needed
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

export async function execInContainer(
  containerId: string,
  command: string,
  cwd: string = '/workspace',
  timeout: number = 120000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const docker = getDocker()
  const container = docker.getContainer(containerId)

  const exec = await container.exec({
    Cmd: ['bash', '-c', `cd ${cwd} && ${command}`],
    AttachStdout: true,
    AttachStderr: true,
    WorkingDir: cwd,
  })

  const stream = await exec.start({ hijack: true, stdin: false })

  let stdout = ''
  let stderr = ''
  let exitCode = 0

  const { setTimeout: setTimeoutFn } = await import('timers/promises')

  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        stream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString()
        })
        stream.on('end', () => resolve())
      }),
      setTimeoutFn(timeout),
    ])
  } catch {
    exitCode = 124 // timeout
  }

  const info = await exec.inspect()
  exitCode = info.ExitCode ?? exitCode

  return { stdout, stderr, exitCode }
}
