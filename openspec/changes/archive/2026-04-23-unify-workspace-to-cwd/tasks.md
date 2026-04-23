## 1. Update types.ts

- [x] 1.1 Make `ToolContext.cwd: string` required (was `cwd?: string`)
- [x] 1.2 Add `cwd?: string` to `AgentConfig` for session workspace - Note: path-guard.ts does not exist in current codebase

## 2. Update tool-executor.ts

- [x] 2.1 Update `executeSingleTool` context construction to add `cwd: config.cwd ?? ''`
- [x] 2.2 Update `executeBatchConcurrently` context construction to add `cwd: config.cwd ?? ''`

## 3. Update streaming-tool-executor.ts

- [x] 3.1 Update `executeTool` context construction to add `cwd: this.config.cwd ?? ''`

## 4. Update BashTool.ts

- [x] 4.1 Accept `context: ToolContext` parameter in execute function
- [x] 4.2 Add `cwd: context.cwd` to `execSync` options
- [x] 4.3 Add `cwd: context.cwd` to `exec` options (background execution)

## 5. Update GrepTool.ts

- [x] 5.1 Accept `context: ToolContext` parameter and use `context.cwd` as default search path
- [x] 5.2 Add `cwd: context.cwd` to primary `execSync` call
- [x] 5.3 Add `cwd: context.cwd` to fallback `execSync` call

## 6. Update GlobTool.ts

- [x] 6.1 Accept `context: ToolContext` parameter and use `context.cwd` as default search directory
- [x] 6.2 Add `cwd: context.cwd` to `execSync` call

## 7. Update file tools (FileReadTool, FileWriteTool, FileEditTool)

- [x] 7.1 Accept `context: ToolContext` parameter in FileReadTool
- [x] 7.2 Accept `context: ToolContext` parameter in FileWriteTool
- [x] 7.3 Accept `context: ToolContext` parameter in FileEditTool

## 8. Build and verify

- [x] 8.1 Run `npm run build` in codenano to verify TypeScript compiles
- [x] 8.2 Run `npm run build` in codenano-api to verify dependent project compiles
- [x] 8.3 Run tests to verify workspace isolation behavior unchanged
