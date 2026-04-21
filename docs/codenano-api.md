# Codenano API Reference

Node.js Fastify HTTP/WebSocket 服务，封装 codenano SDK（基于 Claude Code 核心架构）。

**Powered by Claude Code Architecture**

**Base URL**: `http://localhost:8000`

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ANTHROPIC_AUTH_TOKEN` | **是** | - | Anthropic API 密钥 |
| `ANTHROPIC_BASE_URL` | 否 | `https://api.anthropic.com` | API 端点 |
| `ANTHROPIC_MODEL` | 否 | `claude-sonnet-4-6` | 默认模型 |
| `LOG_LEVEL` | 否 | `INFO` | 日志级别 |
| `AGENT_SERVICE_PORT` | 否 | `8000` | 服务端口 |

## Session API

### 创建 Session

**端点**: `POST /api/v1/sessions`

**请求体**:
```json
{
  "config": {
    "model": "claude-sonnet-4-6",
    "maxTurns": 50,
    "toolPreset": "core"
  },
  "hooks": ["onPreToolUse", "onTurnEnd"],
  "toolPermissions": {
    "Bash": "deny"
  }
}
```

**响应**: `201 Created`
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### config 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `model` | string | `claude-sonnet-4-6` | Claude 模型 |
| `provider` | string | `anthropic` | 提供商：`anthropic`、`bedrock` |
| `awsRegion` | string | - | AWS 区域（provider=bedrock 时） |
| `toolPreset` | string | `core` | 工具预设：`core`、`extended`、`all` |
| `tools` | unknown[] | - | 自定义工具，与 `toolPreset` 互斥，优先 |
| `maxTurns` | number | - | 最大对话轮数 |
| `thinkingConfig` | string | - | `adaptive` 或 `disabled` |
| `maxOutputTokens` | number | - | 最大输出 token 数 |
| `overrideSystemPrompt` | string | - | 替换系统提示词 |
| `appendSystemPrompt` | string | - | 追加到系统提示词 |
| `mcpServers` | MCPServerConfig[] | - | MCP 服务器配置 |
| `persistence` | object | - | 持久化配置 |
| `memory` | object | - | 记忆配置 |

### toolPermissions 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `toolPermissions` | Record<string, 'allow' \| 'deny' \| 'ask'> | `{}` | 未指定的工具默认 `ask` |

### persistence 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | boolean | 启用持久化 |
| `storageDir` | string | 存储目录 |
| `resumeSessionId` | string | 恢复的 session ID |

### memory 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `memoryDir` | string | 记忆目录 |
| `autoLoad` | boolean | 自动加载记忆 |
| `extractStrategy` | string \| object | 提取策略：`disabled`、`auto` 或 `{interval: number}` |
| `extractMaxTurns` | number | 提取最大轮数 |
| `useForkedAgent` | boolean | 使用 fork 代理 |

### MCPServerConfig 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 服务器名称 |
| `transport` | string | 传输类型：`stdio`、`sse`、`http` |
| `command` | string | 启动命令 |
| `args` | string[] | 命令参数 |
| `env` | object | 环境变量 |
| `url` | string | 服务器 URL（transport=sse/http 时） |

### 工具权限

| 模式 | 行为 |
|------|------|
| `allow` | 工具直接执行，无 WebSocket 事件 |
| `deny` | 工具被阻止 |
| `ask` | 发送 WebSocket hook 等待客户端决策（默认） |

### Hook 类型

| 类型 | 触发时机 |
|------|----------|
| `onPreToolUse` | 工具执行前 |
| `onPostToolUse` | 工具执行后 |
| `onTurnStart` | 对话轮开始 |
| `onTurnEnd` | 对话轮结束 |
| `onError` | 发生错误 |
| `onCompact` | 压缩时 |
| `onMaxTurns` | 达到最大轮数 |
| `onSessionStart` | Session 启动时 |

---

### 发送消息

**端点**: `POST /api/v1/sessions/:id/message`

**请求体**:
```json
{
  "prompt": "Hello, explain this code",
  "stream": true
}
```

**流式响应** (`stream: true`):
```
Content-Type: text/event-stream

data: {"type":"query_start","sessionId":"...","turnIndex":0}
data: {"type":"text","text":"Hello! I'd be happy to..."}
data: {"type":"tool_use","tool":"Bash","input":{"command":"ls -la"}}
data: {"type":"tool_result","tool":"Bash","result":"..."}
data: {"type":"result","text":"...","usage":{...},"stopReason":"end_turn"}
```

**SSE 事件类型**: `query_start`、`text`、`tool_use`、`tool_result`、`result`

**非流式响应** (`stream: false`):
```json
{
  "result": {
    "text": "...",
    "usage": { "inputTokens": 100, "outputTokens": 200 },
    "stopReason": "end_turn"
  }
}
```

---

### 获取 Session

**端点**: `GET /api/v1/sessions/:id`

**响应**: `200 OK`
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-04-20T10:00:00.000Z",
  "lastActivity": "2026-04-20T10:05:00.000Z"
}
```

---

### 列出所有 Sessions

**端点**: `GET /api/v1/sessions`

**响应**: `200 OK`
```json
{
  "sessions": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2026-04-20T10:00:00.000Z",
      "lastActivity": "2026-04-20T10:05:00.000Z",
      "active": true
    }
  ]
}
```

---

### 获取 Session 历史

**端点**: `GET /api/v1/sessions/:id/history`

**响应**: `200 OK`
```json
{
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": [{ "type": "text", "text": "Hi" }] }
  ]
}
```

---

### 删除 Session

**端点**: `DELETE /api/v1/sessions/:id`

**响应**: `200 OK`
```json
{ "ok": true }
```

---

## Hook WebSocket API

**端点**: `GET /ws/sessions/:id/hooks`

### 注册 Hooks
```json
{ "type": "register_hook", "hooks": ["onPreToolUse", "onTurnEnd"] }
```

### 接收 Hook 事件
```json
{
  "type": "hook_event",
  "hookId": "uuid",
  "hookType": "onPreToolUse",
  "data": { "toolName": "Bash", "toolInput": { "command": "ls -la" } }
}
```

### 发送 Hook 决策
```json
{ "type": "hook_decision", "hookId": "uuid", "decision": { "behavior": "allow" } }
```

拒绝工具：
```json
{ "type": "hook_decision", "hookId": "uuid", "decision": { "behavior": "deny", "message": "blocked" } }
```

**超时**: 客户端未在 30 秒内响应，决策默认为 `allow`。

**Ping/Pong**:
```json
{ "type": "ping" } → { "type": "pong" }
```

---

## Memory API

### 保存 Memory

**端点**: `POST /api/v1/memory`

**请求体**:
```json
{
  "key": "project-context",
  "content": "This is a Python ML project",
  "type": "context",
  "description": "项目上下文"
}
```

**响应**: `201 Created`
```json
{ "ok": true, "filepath": "/path/to/memory.md" }
```

---

### 获取 Memory

**端点**: `GET /api/v1/memory/:key`

**响应**: `200 OK`
```json
{
  "name": "project-context",
  "description": "项目上下文",
  "type": "context",
  "content": "This is a Python ML project"
}
```

---

### 列出 Memories

**端点**: `GET /api/v1/memory`

**查询参数**: `pattern` - 前缀匹配

**响应**: `200 OK`
```json
{ "memories": [...] }
```

---

### 删除 Memory

**端点**: `DELETE /api/v1/memory/:key`

**响应**: `200 OK`
```json
{ "ok": true }
```

---

## MCP API

### 连接 MCP 服务器

**端点**: `POST /api/v1/mcp/connect`

**请求体**:
```json
{
  "serverId": "filesystem",
  "config": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
    "env": {}
  }
}
```

**响应**: `200 OK`
```json
{ "ok": true, "serverId": "filesystem" }
```

---

### 列出 MCP Tools

**端点**: `GET /api/v1/mcp/tools`

**响应**: `200 OK`
```json
{
  "tools": [
    {
      "serverId": "filesystem",
      "tools": [{ "name": "mcp__server__read_file", "description": "...", "inputSchema": {...} }]
    }
  ]
}
```

---

### 调用 MCP Tool

**端点**: `POST /api/v1/mcp/tools/call`

**请求体**:
```json
{
  "serverId": "filesystem",
  "toolName": "mcp__server__read_file",
  "toolInput": { "path": "/workspace/test.txt" }
}
```

**响应**: `200 OK`
```json
{ "result": "file content here" }
```

---

### 断开 MCP 服务器

**端点**: `DELETE /api/v1/mcp/:serverId`

**响应**: `200 OK`
```json
{ "ok": true }
```

---

## Tools API

### 定义工具

**端点**: `POST /api/v1/tools`

**请求体**:
```json
{
  "name": "my-tool",
  "description": "A custom tool",
  "inputSchema": {
    "query": { "type": "string" },
    "limit": { "type": "number" }
  }
}
```

**响应**: `200 OK`
```json
{ "ok": true, "toolName": "my-tool" }
```

---

### 列出工具

**端点**: `GET /api/v1/tools`

**响应**: `200 OK`
```json
{ "tools": [{ "name": "my-tool", "description": "A custom tool" }] }
```

---

### 获取工具

**端点**: `GET /api/v1/tools/:name`

**响应**: `200 OK`
```json
{ "name": "my-tool", "description": "A custom tool" }
```

---

### 删除工具

**端点**: `DELETE /api/v1/tools/:name`

**响应**: `200 OK`
```json
{ "ok": true }
```

---

## Cost API

### 获取模型定价

**端点**: `GET /api/v1/cost/pricing`

**查询参数**: `model` - 可选，指定模型

**响应**: `200 OK`
```json
{
  "models": [
    { "model": "claude-sonnet-4-6", "pricing": { "input": 0.003, "output": 0.015 } }
  ]
}
```

---

### 计算成本

**端点**: `POST /api/v1/cost/calculate`

**请求体**:
```json
{
  "model": "claude-sonnet-4-6",
  "usage": { "inputTokens": 1000, "outputTokens": 500 }
}
```

**响应**: `200 OK`
```json
{ "model": "claude-sonnet-4-6", "usage": {...}, "costUSD": 0.0135 }
```

---

## Git API

### 获取 Git 状态

**端点**: `GET /api/v1/git/state`

**查询参数**: `path` - 可选，仓库路径

**响应**: `200 OK`
```json
{ "branch": "main", "clean": false, "ahead": 2, "behind": 0 }
```

---

## Skills API

### 列出 Skills

**端点**: `GET /api/v1/skills`

**查询参数**: `path` - 可选，skills 目录，默认 `.claude/skills`

**响应**: `200 OK`
```json
{
  "skills": [{
    "name": "code-review",
    "description": "Review code changes",
    "filePath": "/workspace/.claude/skills/code-review.md",
    "allowedTools": ["Bash", "FileRead"],
    "arguments": [{ "name": "target", "required": true }],
    "context": {}
  }]
}
```

---

### 获取 Skill 内容

**端点**: `GET /api/v1/skills/:name`

**响应**: `200 OK`
```json
{
  "name": "code-review",
  "description": "Review code changes",
  "content": "## Code Review...",
  "filePath": "/workspace/.claude/skills/code-review.md"
}
```

---

### 展开 Skill 内容

**端点**: `POST /api/v1/skills/expand`

**请求体**:
```json
{ "content": "Review {{target}} for bugs", "args": "target=src/main.py" }
```

**响应**: `200 OK`
```json
{ "expanded": "Review src/main.py for bugs" }
```

---

## 错误响应

统一格式：
```json
{ "error": "错误描述" }
```

| 状态码 | 说明 |
|--------|------|
| `400` | 请求参数无效 |
| `404` | 资源不存在 |
| `500` | 服务器内部错误 |

---

## 优雅关闭

收到 SIGTERM/SIGINT 时：
1. 停止接受新请求
2. 关闭所有 WebSocket 连接
3. 中止所有活跃 session
4. 断开所有 MCP 服务器连接
5. 退出进程
