# Codenano API Reference

Node.js Fastify HTTP/WebSocket 服务，直接封装 codenano SDK。

## Base URL

```
http://localhost:8000
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ANTHROPIC_AUTH_TOKEN` | **是** | - | Anthropic API 密钥，**未设置则服务无法启动** |
| `ANTHROPIC_BASE_URL` | 否 | `https://api.anthropic.com` | API 端点 |
| `ANTHROPIC_MODEL` | 否 | `claude-sonnet-4-6` | 默认模型，用于 config.model 未指定时 |
| `LOG_LEVEL` | 否 | `INFO` | 日志级别 |
| `AGENT_SERVICE_PORT` | 否 | `8000` | 服务端口 |
| `SB_TTL_MINUTES` | 否 | `30` | Session 存活时间（分钟） |

---

## 重要行为说明

### 1. 工具配置互斥

`toolPreset` 和 `tools` **不可同时生效**，同时传时 `tools` 优先，`toolPreset` 被忽略。

```json
// 错误用法：toolPreset 会被忽略
{"config": {"toolPreset": "extended", "tools": [...]}}

// 正确用法：二选一
{"config": {"toolPreset": "extended"}}
{"config": {"tools": [...]}}
```

### 2. 模型优先级

```
config.model > ANTHROPIC_MODEL 环境变量 > 默认值 claude-sonnet-4-6
```

### 3. 工具权限默认值

未在 `toolPermissions` 中指定的工具，**默认行为是 `ask`**（需要客户端决策）。

### 4. Session 404 处理

访问不存在的 session 时，所有接口统一返回 `404 Not Found`。

### 5. Memory SDK 限制

codenano SDK 的 Memory 存储为**本地文件系统**，接口返回字段为 SDK 定义的 `name`/`description`，与请求的 `key` 不同。

---

## Session API

### 创建 Session

创建新的 agent session。

**端点**: `POST /api/v1/sessions`

**请求体**:

```json
{
  "config": {
    "model": "claude-sonnet-4-6",
    "maxTurns": 50,
    "tools": ["Bash", "FileRead", "FileWrite"],
    "toolPreset": "core"
  },
  "hooks": ["onPreToolUse", "onTurnEnd"],
  "toolPermissions": {
    "Bash": "deny"
  }
}
```

> **注意**: `systemPrompt` 不是有效字段，请使用 `overrideSystemPrompt` 或 `appendSystemPrompt`

**响应**: `201 Created`

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### config 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `model` | string | `claude-sonnet-4-6` | Claude 模型，优先级：config.model > ANTHROPIC_MODEL 环境变量 > 默认值 |

> **模型优先级**: `config.model` > `ANTHROPIC_MODEL` 环境变量 > 默认值 `claude-sonnet-4-6`
| `apiKey` | string | - | API 密钥（通常用环境变量） |
| `baseURL` | string | - | API 端点 |
| `provider` | string | `anthropic` | 提供商：`anthropic`、`bedrock` |
| `awsRegion` | string | - | AWS 区域（provider=bedrock 时） |
| `fallbackModel` | string | - | 备用模型 |
| `maxTurns` | number | - | 最大对话轮数 |
| `thinkingConfig` | string | - | `adaptive` 或 `disabled` |
| `maxOutputTokens` | number | - | 最大输出 token 数 |
| `maxOutputRecoveryAttempts` | number | - | 输出恢复重试次数 |
| `toolPreset` | string | `core` | 工具预设：`core`、`extended`、`all`，与 `tools` 二选一 |
| `tools` | unknown[] | `coreTools()` | 自定义工具列表，与 `toolPreset` 二选一，优先于 `toolPreset` |

> **重要**: `tools` 和 `toolPreset` 互斥。**同时传两个时，`tools` 生效，`toolPreset` 被忽略**。
> - 只需要预设工具：用 `toolPreset`
> - 需要自定义工具：用 `tools`
> - 通常建议只使用 `toolPreset`
| `toolResultBudget` | boolean | - | 工具结果预算 |
| `streamingToolExecution` | boolean | - | 流式工具执行 |
| `systemPrompt` | string | - | 系统提示词 |
| `identity` | string | - | 身份标识 |
| `language` | string | - | 首选语言 |
| `overrideSystemPrompt` | string | - | 完全替换系统提示词 |
| `appendSystemPrompt` | string | - | 追加到系统提示词末尾 |
| `mcpServers` | MCPServerConfig[] | `[]` | MCP 服务器配置 |
| `persistence` | object | - | 持久化配置 |
| `memory` | object | - | 记忆配置 |
| `autoCompact` | boolean | - | 自动压缩 |
| `autoLoadInstructions` | boolean | - | 自动加载指令 |
| `maxOutputTokensCap` | boolean | - | 输出 token 上限 |

#### persistence 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | boolean | 启用持久化 |
| `storageDir` | string | 存储目录 |
| `resumeSessionId` | string | 恢复的 session ID |

#### memory 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `memoryDir` | string | 记忆目录 |
| `autoLoad` | boolean | 自动加载记忆 |
| `extractStrategy` | string \\| object | 提取策略：`disabled`、`auto` 或 `{interval: number}` |
| `extractMaxTurns` | number | 提取最大轮数 |
| `useForkedAgent` | boolean | 使用 fork 代理 |

#### MCPServerConfig 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 服务器名称 |
| `transport` | string | 传输类型：`stdio`、`sse`、`http` |
| `command` | string | 启动命令 |
| `args` | string[] | 命令参数 |
| `env` | object | 环境变量 |
| `url` | string | 服务器 URL（transport=sse/http 时） |
| `headers` | object | 请求头 |

#### toolPermissions 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `toolPermissions` | Record<string, 'allow' \\| 'deny' \\| 'ask'> | `{}` | 工具权限规则，未指定的工具默认 `ask` |

#### hooks 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `hooks` | `HookType[]` | 订阅的 hook 类型，见 [Hook WebSocket API](#hook-websocket-api) |

#### 可用的 Hook 类型

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

向 session 发送消息。

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

**非流式响应** (`stream: false`):

```json
{
  "result": {
    "text": "...",
    "usage": {
      "inputTokens": 100,
      "outputTokens": 200
    },
    "stopReason": "end_turn"
  }
}
```

#### SSE 事件类型

| 事件类型 | 说明 |
|----------|------|
| `query_start` | 查询开始 |
| `text` | 文本片段 |
| `tool_use` | 工具调用 |
| `tool_result` | 工具结果 |
| `result` | 最终结果 |

#### 错误响应: `404 Not Found`

```json
{
  "error": "Session not found"
}
```

---

### 获取 Session

获取 session 元数据。

**端点**: `GET /api/v1/sessions/:id`

**响应**: `200 OK`

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-04-20T10:00:00.000Z",
  "lastActivity": "2026-04-20T10:05:00.000Z",
  "historyLength": 5
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
      "lastActivity": "2026-04-20T10:05:00.000Z"
    }
  ]
}
```

---

### 获取 Session 历史

获取会话历史记录。

**端点**: `GET /api/v1/sessions/:id/history`

**响应**: `200 OK`

> **注意**: History 在沙箱模式下不可用，始终返回空数组。

```json
{
  "history": [],
  "message": "History not available in sandboxed mode"
}
```

---

### 删除 Session

关闭并删除 session。

**端点**: `DELETE /api/v1/sessions/:id`

**响应**: `200 OK`

```json
{
  "ok": true
}
```

---

---

## Hook WebSocket API

客户端通过 WebSocket 接收 hook 事件并响应。

**端点**: `GET /ws/sessions/:id/hooks`

### 连接

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/sessions/550e8400-e29b-41d4-a716-446655440000/hooks');
```

### 注册 Hooks

客户端发送注册消息：

```json
{
  "type": "register_hook",
  "hooks": ["onPreToolUse", "onTurnEnd"]
}
```

### 接收 Hook 事件

服务发送 hook 事件：

```json
{
  "type": "hook_event",
  "hookId": "uuid",
  "hookType": "onPreToolUse",
  "data": {
    "toolName": "Bash",
    "toolInput": {"command": "ls -la"}
  }
}
```

### 发送 Hook 决策

客户端响应决策：

```json
{
  "type": "hook_decision",
  "hookId": "uuid",
  "decision": {
    "behavior": "allow"
  }
}
```

拒绝工具执行：

```json
{
  "type": "hook_decision",
  "hookId": "uuid",
  "decision": {
    "behavior": "deny",
    "message": "blocked"
  }
}
```

#### Hook 超时

客户端未在 30 秒内响应，决策默认为 `allow`。

#### Ping/Pong

客户端可发送 ping 保持连接活跃：

```json
{"type": "ping"}
```

服务端响应：

```json
{"type": "pong"}
```

#### 错误响应: `404 Not Found`

Session 不存在时拒绝连接。

---

## Memory API

> **WIP** - 此接口依赖 codenano SDK 本地文件系统存储。

跨会话持久化记忆。

### 保存 Memory

**端点**: `POST /api/v1/memory`

**请求体**:

```json
{
  "key": "project-context",
  "content": "This is a Python ML project",
  "type": "context"
}
```

**响应**: `201 Created`

```json
{
  "ok": true
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | string | - | 记忆键名 |
| `content` | string | - | 记忆内容 |
| `type` | string | `general` | 记忆类型 |
| `description` | string | `key` | 记忆描述 |

---

### 获取 Memory

**端点**: `GET /api/v1/memory/:key`

**响应**: `200 OK`

```json
{
  "name": "project-context",
  "description": "project-context",
  "type": "context",
  "content": "This is a Python ML project"
}
```

**注意**: 实际返回字段为 `name`/`description`，与请求的 `key` 不同。这是 SDK 行为，codenano-api 无权修改。

#### 错误响应: `404 Not Found`

```json
{
  "error": "Memory not found"
}
```

---

### 列出 Memories

**端点**: `GET /api/v1/memory`

**查询参数**:

| 参数 | 说明 |
|------|------|
| `pattern` | 前缀匹配（匹配 `name` 字段） |

**响应**: `200 OK`

```json
{
  "memories": [
    {
      "name": "project-context",
      "description": "project-context",
      "type": "context",
      "content": "This is a Python ML project"
    }
  ]
}
```

**示例**: `GET /api/v1/memory?pattern=project-`

---

### 删除 Memory

**端点**: `DELETE /api/v1/memory/:key`

**响应**: `200 OK`

```json
{
  "ok": true
}
```

#### 错误响应: `404 Not Found`

```json
{
  "error": "Memory not found"
}
```

---

---

## MCP API

> **WIP** - 此接口尚未稳定，等待进一步开发。

MCP (Model Context Protocol) 服务器生命周期管理。

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
{
  "ok": true,
  "serverId": "filesystem"
}
```

#### 行为

- `serverId` 省略时自动生成 UUID
- 已存在的 `serverId` 会先断开旧连接

---

### 列出 MCP Tools

获取所有已连接 MCP 服务器的工具。

**端点**: `GET /api/v1/mcp/tools`

**响应**: `200 OK`

```json
{
  "tools": [
    {
      "serverId": "filesystem",
      "tools": [
        {
          "name": "mcp__server__read_file",
          "description": "Read a file from the filesystem",
          "inputSchema": {
            "type": "object",
            "properties": {
              "path": {"type": "string"}
            }
          }
        }
      ]
    }
  ]
}
```

无服务器连接时返回空数组：

```json
{
  "tools": []
}
```

---

### 调用 MCP Tool

直接调用 MCP 工具（不通过 agent）。

**端点**: `POST /api/v1/mcp/tools/call`

**请求体**:

```json
{
  "serverId": "filesystem",
  "toolName": "mcp__server__read_file",
  "toolInput": {
    "path": "/workspace/test.txt"
  }
}
```

**响应**: `200 OK`

```json
{
  "result": "file content here",
  "isError": false
}
```

#### 错误响应: `404 Not Found`

```json
{
  "error": "MCP server not found"
}
```

---

### 断开 MCP 服务器

**端点**: `DELETE /api/v1/mcp/:serverId`

**响应**: `200 OK`

```json
{
  "ok": true
}
```

#### 错误响应: `404 Not Found`

```json
{
  "error": "MCP server not found"
}
```

---

## 工具权限

Session 创建时可配置工具权限规则。

### 权限模式

| 模式 | 行为 |
|------|------|
| `allow` | 工具直接执行，无 WebSocket 事件 |
| `deny` | 工具被阻止，返回错误 |
| `ask` | 发送 WebSocket hook 事件等待客户端决策（默认） |

### 配置示例

```json
{
  "toolPermissions": {
    "Bash": "deny",
    "FileWrite": "ask",
    "FileRead": "allow"
  }
}
```

### 行为

- **未配置的工具**: 默认 `ask` 模式
- **Deny 响应**: 返回 `{"error": "Tool blocked: denied by policy"}`
- **Ask 模式超时**: 30 秒后默认为 `allow`

---

## 工具预设

Session 创建时可指定工具预设。

### 预设值

| 预设 | 说明 |
|------|------|
| `core` | 核心工具（默认） |
| `extended` | 扩展工具集 |
| `all` | 所有可用工具 |

### 配置示例

```json
{
  "config": {
    "toolPreset": "extended"
  }
}
```

### 验证

无效的 `toolPreset` 值返回 `400 Bad Request`:

```json
{
  "error": "Invalid tool preset. Must be \"core\", \"extended\", or \"all\"."
}
```

---

## 优雅关闭

服务收到 SIGTERM/SIGTERM 时：

1. 停止接受新请求
2. 关闭所有 WebSocket 连接
3. 中止所有活跃 session
4. 断开所有 MCP 服务器连接
5. 退出进程

---

## 错误响应格式

所有 API 错误遵循统一格式：

```json
{
  "error": "错误描述"
}
```

| 状态码 | 说明 |
|--------|------|
| `400` | 请求参数无效 |
| `404` | 资源不存在 |
| `500` | 服务器内部错误 |
