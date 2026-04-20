# 启动服务进行测试

## 环境要求

- Node.js 18+
- [bubblewrap](https://github.com/containers/bubblewrap)（沙箱隔离，可选）

```bash
# 安装 bubblewrap (Linux)
sudo apt install bubblewrap

# 验证
bwrap --version
```

## 构建依赖

```bash
# 安装 agent-service 依赖
cd agent-service
npm install && npm run build
```

## 环境变量配置

创建 `agent-service/.env`:

```bash
ANTHROPIC_AUTH_TOKEN=your-api-key-here
# 可选配置
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-sonnet-4-6
LOG_LEVEL=INFO
AGENT_SERVICE_PORT=8000
```

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ANTHROPIC_AUTH_TOKEN` | 是 | - | Anthropic API 密钥 |
| `ANTHROPIC_BASE_URL` | 否 | `https://api.anthropic.com` | API 端点 |
| `ANTHROPIC_MODEL` | 否 | `claude-sonnet-4-6` | 默认模型 |
| `LOG_LEVEL` | 否 | `INFO` | 日志级别 |
| `AGENT_SERVICE_PORT` | 否 | `8000` | 服务端口 |

## 启动服务

```bash
cd agent-service
npm run start
```

服务启动后会：
1. 验证 `ANTHROPIC_AUTH_TOKEN` 必填变量
2. 初始化 SessionRegistry
3. 启动 Fastify HTTP/WebSocket 服务

## 验证服务运行

```bash
# 创建 session
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"config": {"model": "claude-sonnet-4-6"}}'

# 列出 sessions
curl http://localhost:8000/api/v1/sessions
```

## API 参考

### 创建 Session

```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "model": "claude-sonnet-4-6",
      "tools": ["Bash", "FileRead", "FileWrite"],
      "toolPermissions": {"Bash": "ask"}
    }
  }'
```

**支持的配置参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | Claude 模型，默认 `claude-sonnet-4-6` |
| `maxTurns` | number | 最大对话轮数 |
| `tools` | string[] | 启用的工具列表 |
| `toolPreset` | string | 工具预设：`core`、`extended`、`all` |
| `toolPermissions` | Record<string, 'allow'\\| 'deny'\\| 'ask'> | 工具权限规则 |
| `mcpServers` | McpServerConfig[] | MCP 服务器配置 |
| `systemPrompt` | string | 系统提示词 |

### 发送消息

```bash
# 流式响应（SSE）
curl -X POST http://localhost:8000/api/v1/sessions/{session_id}/message \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello", "stream": true}'

# 非流式响应
curl -X POST http://localhost:8000/api/v1/sessions/{session_id}/message \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello", "stream": false}'
```

### Hook WebSocket

客户端可通过 WebSocket 接收 hook 事件并响应：

```bash
# 连接 hook WebSocket
ws://localhost:8000/ws/sessions/{session_id}/hooks
```

注册 hooks 后，客户端可接收 `onPreToolUse` 等事件并决定 allow/deny。

### Memory API

```bash
# 保存 memory
curl -X POST http://localhost:8000/api/v1/memory \
  -H "Content-Type: application/json" \
  -d '{"key": "project-context", "content": "This is a Python ML project"}'

# 读取 memory
curl http://localhost:8000/api/v1/memory/project-context

# 列出所有 memories
curl http://localhost:8000/api/v1/memory

# 删除 memory
curl -X DELETE http://localhost:8000/api/v1/memory/project-context
```

### MCP 服务器管理

```bash
# 连接 MCP 服务器
curl -X POST http://localhost:8000/api/v1/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"serverId": "filesystem", "config": {"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]}}'

# 列出 MCP tools
curl http://localhost:8000/api/v1/mcp/tools

# 调用 MCP tool
curl -X POST http://localhost:8000/api/v1/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"serverId": "filesystem", "toolName": "mcp__server__read_file", "toolInput": {"path": "/workspace/test.txt"}}'

# 断开 MCP 服务器
curl -X DELETE http://localhost:8000/api/v1/mcp/{serverId}
```

### 其他端点

```bash
# 列出所有 session
curl http://localhost:8000/api/v1/sessions

# 查看特定 session
curl http://localhost:8000/api/v1/sessions/{session_id}

# 获取 session 历史
curl http://localhost:8000/api/v1/sessions/{session_id}/history

# 关闭 session
curl -X DELETE http://localhost:8000/api/v1/sessions/{session_id}
```

## 开发调试

```bash
# 开发模式（热重载）
npm run dev

# 查看日志
tail -f logs/agent-service.log
```

## 常见问题

### ANTHROPIC_AUTH_TOKEN 未设置

```
Error: ANTHROPIC_AUTH_TOKEN is required
```

**解决**: 确保 `.env` 文件存在且包含有效的 API key

### WebSocket 连接失败

```
Error: Session not found
```

**解决**: 确保 session 存在，session ID 正确

### bwrap 不可用

bubblewrap 是可选的，用于沙箱隔离。服务可在没有 bwrap 的情况下运行（开发模式）。

```bash
# 跳过 bwrap 检查（开发环境）
export ALLOW_NO_BWRAP=1
npm run dev
```
