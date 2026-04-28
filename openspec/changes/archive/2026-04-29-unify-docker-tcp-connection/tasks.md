## 1. Docker Service Consolidation

- [x] 1.1 Merge sandbox-exec.ts functions into docker-service.ts
- [x] 1.2 Remove all SSH connection logic
- [x] 1.3 Add TCP connection configuration (host/port from env vars)
- [x] 1.4 Add execCommand() function using dockerode.container.exec()
- [x] 1.5 Add execCommandWithStdin() function using dockerode hijack stream
- [x] 1.6 Add execDetached() function for background tasks
- [x] 1.7 Update health check with TCP configuration error messages

## 2. SandboxBashTool Refactor

- [x] 2.1 Remove spawnSync docker exec calls
- [x] 2.2 Replace with docker-service.ts exec functions
- [x] 2.3 Remove SANDBOX_MODE environment variable checks

## 3. Environment Variables Update

- [x] 3.1 Update .env.example: replace SSH config with TCP config
- [x] 3.2 Add DOCKER_TCP_HOST, DOCKER_TCP_PORT variables

## 4. Delete Deprecated Files

- [x] 4.1 Delete sandbox-exec.ts (functionality merged into docker-service.ts)

## 5. Verification

- [x] 5.1 Run TypeScript type check (`npm run check`)
- [x] 5.2 Run unit tests (`npm run test`)
- [x] 5.3 Verify local Docker TCP connectivity
- [x] 5.4 Verify all sandbox tools (read/write/bash/glob/grep) work correctly
- [x] 5.5 Verify background task execution works
