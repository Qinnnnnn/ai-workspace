## 1. Sandbox Exec Executor — New File

- [x] 1.1 Create `utils/sandbox-exec.ts` with `executeCoreCommand(containerId, command, timeout?)`
- [x] 1.2 Detect `SANDBOX_MODE === 'remote'` and inject `DOCKER_HOST=ssh://user@host` into spawn env only
- [x] 1.3 For local mode, pass through default env (no DOCKER_HOST override needed)
- [x] 1.4 Use `spawnSync('docker', ['exec', containerId, 'bash', '-c', command])` — no bash -c double-nesting
- [x] 1.5 Set `maxBuffer: 50 * 1024 * 1024` for all commands
- [x] 1.6 Export `executeStdinCommand(containerId, command, input)` variant for stdin streaming (FileWrite/FileEdit)

## 2. Docker Service — Dual-mode Lifecycle

- [x] 2.1 Add `SANDBOX_MODE` env var detection (`local` | `remote`, default `local`)
- [x] 2.2 `getDocker()` local mode: `new Docker()` (no args, uses default socket)
- [x] 2.3 `getDocker()` remote mode: `new Docker({ ssh: { host, user, privateKey } })`
- [x] 2.4 `createContainer()`: replace `Binds` with tmpfs `Mounts` + `TmpfsOptions: { SizeBytes: 512 * 1024 * 1024 }`
- [x] 2.5 Remove `physicalPath` parameter body usage in `createContainer()` (keep signature for compat)
- [x] 2.6 Keep `startContainer()` / `stopContainer()` unchanged (dockerode handles them)

## 3. Sessions — Workspace Path Cleanup

- [x] 3.1 Remove `mkdirSync` for workspace directory (tmpfs auto-manages `/workspace`)
- [x] 3.2 Change `runtime.hostWorkspaceDir` from `physicalPath` to fixed `'/workspace'`
- [x] 3.3 Confirm no remaining `Binds` references in session creation path

## 4. Path Sandbox — Container-side Validation

- [x] 4.1 Replace `resolveSecurePhysicalPath` with `executeCoreCommand` call inside container
- [x] 4.2 Run `realpath --relative-base=/workspace {path}` inside container for validation
- [x] 4.3 Reject if resolved path starts with `..` (path traversal)
- [x] 4.4 Preserve `PathTraversalViolation` error path

## 5. BashTool — Use executeCoreCommand

- [x] 5.1 Remove inline `spawnSync('bash', ['-c', dockerCmd])` boilerplate
- [x] 5.2 Replace with `executeCoreCommand(containerId, input.command, timeout)`
- [x] 5.3 Verify `isReadOnly` / `isConcurrencySafe` / background mode still work
- [x] 5.4 Verify background mode (`run_in_background`) still uses `exec()` pattern

## 6. GlobTool / GrepTool — Use executeCoreCommand

- [x] 6.1 `SandboxGlobTool`: replace `spawnSync('bash', ['-c', dockerCmd])` with `executeCoreCommand`
- [x] 6.2 `SandboxGrepTool`: replace `spawnSync('bash', ['-c', dockerCmd])` with `executeCoreCommand`
- [x] 6.3 Both tools' docker exec strings (`docker exec ${containerId} bash -c "cd /workspace && ${cmd}"`) become direct `executeCoreCommand` calls

## 7. FileRead Tool — Docker Exec Cat

- [x] 7.1 Replace `fs.readFileSync` with `executeCoreCommand(containerId, `cat '${safePath}'`)
- [x] 7.2 Return stdout as file content
- [x] 7.3 Handle non-zero exit as error

## 8. FileWrite Tool — Stdin Streaming

- [x] 8.1 Replace `fs.writeFileSync` with `executeStdinCommand`
- [x] 8.2 Command: `mkdir -p $(dirname '${path}') && cat > '${path}'`
- [x] 8.3 Pass content via `input` parameter (stdin, no command interpolation)
- [x] 8.4 Return confirmation with line count

## 9. FileEdit Tool — Memory Replace + Stdin Write

- [x] 9.1 First exec: `executeCoreCommand(containerId, `cat '${path}'`)`
- [x] 9.2 Node.js memory: `String.split().join()` or `String.replace()` (no sed)
- [x] 9.3 Validate `old_string` exists and is unique before proceeding
- [x] 9.4 Second exec: `executeStdinCommand` with updated content
- [x] 9.5 Return confirmation with replacement count

## 10. Environment Variables

- [x] 10.1 `SANDBOX_MODE` — `local` (default) | `remote`
- [x] 10.2 `DOCKER_HOST_HOST` — remote Docker host (only in remote mode)
- [x] 10.3 `DOCKER_HOST_USER` — SSH user (only in remote mode)
- [x] 10.4 `DOCKER_HOST_KEY_PATH` — SSH private key path (only in remote mode)
- [x] 10.5 `SANDBOX_DOCKER_IMAGE` — Docker image (both modes)
- [x] 10.6 Update `.env.example` with all vars + comments explaining dual-mode

## 11. Testing

- [ ] 11.1 `SANDBOX_MODE=local`: verify container starts via local docker socket
- [ ] 11.2 `SANDBOX_MODE=remote`: verify container starts via SSH tunnel
- [ ] 11.3 FileWrite → FileRead round-trip (verify content matches)
- [ ] 11.4 FileEdit — verify replacement count is correct
- [ ] 11.5 Path traversal rejection — `/etc/passwd`, `../` patterns blocked
- [ ] 11.6 Session deletion — container stopped and removed
- [ ] 11.7 Glob / Grep / Bash return expected results
- [ ] 11.8 Docker daemon unavailable returns HTTP 503
- [ ] 11.9 Mode switch: `SANDBOX_MODE=local` → `SANDBOX_MODE=remote` requires restart (env change not hot-reloaded)
