## 1. Add RuntimeContext type to codenano

- [x] 1.1 Define `RuntimeContext` discriminated union in codenano types
- [x] 1.2 Add `runtime: RuntimeContext` field to `AgentConfig`
- [x] 1.3 Remove top-level `cwd?`, `hostWorkspaceDir?`, `containerId?` fields from `AgentConfig`

## 2. Update createAgentInstance in codenano-api

- [x] 2.1 Branch on `config.runtime.type` in `createAgentInstance`
- [x] 2.2 For sandbox: pass runtime with sandbox tools (runtime is passed through to tools)
- [x] 2.3 For local: pass cwd to createAgent with local tools

## 3. Update session creation route

- [x] 3.1 Build `runtime: { type: 'sandbox', cwd: '/workspace', hostWorkspaceDir: physicalPath, containerId }` for Docker sessions
- [x] 3.2 Remove manual mapping of cwd/containerId fields

## 4. Update CLI entry point (if applicable)

- [x] 4.1 Update direct agent creation to use `runtime: { type: 'local', cwd: process.cwd() }`

## 5. Verification

- [x] 5.1 TypeScript compilation passes with no errors
- [x] 5.2 Session creation with sandbox config works correctly
- [x] 5.3 All existing tests pass
- [x] 5.4 Manual testing of local vs sandbox modes