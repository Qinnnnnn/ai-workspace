## 1. codenano: Add workspace to types

- [x] 1.1 Add `workspace: string` field to `ToolContext` interface in `src/types.ts`
- [x] 1.2 Add `workspace?: string` field to `AgentConfig` interface in `src/types.ts`

## 2. codenano: Update tool-executor.ts

- [x] 2.1 Update `executeSingleTool` function signature to accept workspace parameter
- [x] 2.2 Populate `ToolContext.workspace` from config in function body

## 3. codenano: Update tools to use context.workspace

- [x] 3.1 Update `FileReadTool` to use `context.workspace` instead of `process.env.CODENANO_WORKSPACE`
- [x] 3.2 Update `FileWriteTool` to use `context.workspace` instead of `process.env.CODENANO_WORKSPACE`
- [x] 3.3 Update `FileEditTool` to use `context.workspace` instead of `process.env.CODENANO_WORKSPACE`
- [x] 3.4 Update `BashTool` to use `context.workspace` instead of `process.env.CODENANO_WORKSPACE`
- [x] 3.5 Update `GrepTool` to use `context.workspace` instead of `process.env.CODENANO_WORKSPACE`
- [x] 3.6 Update `GlobTool` to use `context.workspace` instead of `process.env.CODENANO_WORKSPACE`

## 4. codenano-api: Update session-registry.ts

- [x] 4.1 Add `workspace` field to `SessionEntry` interface
- [x] 4.2 Update `register` method to accept workspace parameter
- [x] 4.3 Update `destroy` method to delete workspace directory using `fs.rmSync`

## 5. codenano-api: Update sessions.ts routes

- [x] 5.1 Update session creation to create workspace directory at `~/.agent-core/workspaces/{sessionId}/`
- [x] 5.2 Pass workspace path to `createAgentInstance` via `AgentFactoryConfig`
- [x] 5.3 Update `GET /api/v1/sessions/:id` response to include `workspace` field
- [x] 5.4 Update `GET /api/v1/sessions` response to include `workspace` field for each session
- [x] 5.5 Pass workspace to `registry.register` call

## 6. codenano: Build and verify

- [x] 6.1 Run `npm run build` in codenano to verify TypeScript compiles
- [x] 6.2 Run `npm run build` in codenano-api to verify TypeScript compiles

## 7. Testing

- [x] 7.1 Test concurrent sessions don't interfere with each other's workspace
- [x] 7.2 Test session deletion cleans up workspace directory
- [x] 7.3 Test API responses include workspace field
