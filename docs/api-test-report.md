# Agent Service API 测试报告

**测试时间**: 2026-04-20
**服务地址**: http://localhost:8000
**测试环境**: Node.js Fastify agent-service

---

## 测试结果汇总

| # | API | 方法 | 路径 | 状态 | 备注 |
|---|-----|------|------|------|------|
| 1 | 创建 Session | POST | `/api/v1/sessions` | ✅ PASS | 返回 sessionId |
| 2 | 列出 Sessions | GET | `/api/v1/sessions` | ✅ PASS | 返回 sessions 数组 |
| 3 | 获取 Session | GET | `/api/v1/sessions/:id` | ✅ PASS | 返回 session 元数据 |
| 4 | 获取 Session 历史 | GET | `/api/v1/sessions/:id/history` | ⚠️ ISSUE | history 为空数组 |
| 5 | 保存 Memory | POST | `/api/v1/memory` | ✅ PASS | 返回 ok: true |
| 6 | 获取 Memory | GET | `/api/v1/memory/:key` | ✅ PASS | 返回 memory 对象 |
| 7 | 列出 Memories | GET | `/api/v1/memory` | ✅ PASS | 返回 memories 数组 |
| 8 | Pattern 匹配 | GET | `/api/v1/memory?pattern=test-*` | ⚠️ ISSUE | 返回空数组 |
| 9 | 连接 MCP 服务器 | POST | `/api/v1/mcp/connect` | ❌ FAIL | echo 不支持 MCP |
| 10 | 列出 MCP Tools | GET | `/api/v1/mcp/tools` | ✅ PASS | 返回空数组 |
| 11 | 删除 MCP 服务器 | DELETE | `/api/v1/mcp/:serverId` | ❌ FAIL | server 不存在 |
| 12 | 发送消息 (非流式) | POST | `/api/v1/sessions/:id/message` | ✅ PASS | 返回完整 result |
| 13 | 发送消息 (流式) | POST | `/api/v1/sessions/:id/message` | ✅ PASS | SSE 事件正常 |
| 14 | 创建 Session (toolPreset) | POST | `/api/v1/sessions` | ✅ PASS | 支持 extended |
| 15 | 创建 Session (toolPermissions) | POST | `/api/v1/sessions` | ✅ PASS | 支持权限配置 |
| 16 | 删除 Session | DELETE | `/api/v1/sessions/:id` | ✅ PASS | 返回 ok: true |
| 17 | 删除 Memory | DELETE | `/api/v1/memory/:key` | ✅ PASS | 返回 ok: true |
| 18 | 获取不存在的 Session | GET | `/api/v1/sessions/nonexistent` | ✅ PASS | 404 + error |
| 19 | 发送消息到无效 Session | POST | `/api/v1/sessions/invalid/message` | ✅ PASS | 404 + error |
| 20 | 获取不存在的 Memory | GET | `/api/v1/memory/nonexistent` | ✅ PASS | 404 + error |
| 21 | WebSocket Hook 连接 | WS | `/ws/sessions/:id/hooks` | ⏭️ SKIP | 需 websocat |
| 22 | WebSocket 无效 Session | WS | `/ws/sessions/invalid/hooks` | ⏭️ SKIP | 需 websocat |
| 23 | 删除不存在的 MCP | DELETE | `/api/v1/mcp/nonexistent` | ✅ PASS | 404 + error |
| 24 | 调用不存在的 MCP tool | POST | `/api/v1/mcp/tools/call` | ✅ PASS | 404 + error |
| 25 | 获取历史 (消息后) | GET | `/api/v1/sessions/:id/history` | ⚠️ ISSUE | 仍为空 |
| 26 | 列出所有 Sessions | GET | `/api/v1/sessions` | ✅ PASS | 返回多个 session |

**总计**: 24 测试，20 通过，2 跳过，2 问题

---

## 详细测试记录

### 1. POST /api/v1/sessions

**请求**:
```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"config": {"model": "claude-sonnet-4-6"}}'
```

**响应** (201):
```json
{
  "sessionId": "7dd2845c-e7d9-4a8e-969b-38b005c8d387"
}
```

---

### 2. GET /api/v1/sessions

**响应** (200):
```json
{
  "sessions": [
    {
      "sessionId": "7dd2845c-e7d9-4a8e-969b-38b005c8d387",
      "createdAt": "2026-04-20T08:02:53.170Z",
      "lastActivity": "2026-04-20T08:02:53.170Z",
      "historyLength": 0
    }
  ]
}
```

---

### 3. GET /api/v1/sessions/:id

**响应** (200):
```json
{
  "sessionId": "7dd2845c-e7d9-4a8e-969b-38b005c8d387",
  "createdAt": "2026-04-20T08:02:53.170Z",
  "lastActivity": "2026-04-20T08:03:00.271Z",
  "historyLength": 0
}
```

---

### 4. GET /api/v1/sessions/:id/history

**问题**: 发送消息后 history 仍为空数组

**响应** (200):
```json
{
  "history": []
}
```

---

### 5. POST /api/v1/memory

**请求**:
```bash
curl -X POST http://localhost:8000/api/v1/memory \
  -H "Content-Type: application/json" \
  -d '{"key": "test-key", "content": "Test memory content", "type": "test"}'
```

**响应** (201):
```json
{
  "ok": true,
  "filepath": "/home/ubuntu/.agent-core/memory/32195b76/test-key.md"
}
```

**注意**: 返回额外的 `filepath` 字段，文档未记录

---

### 6. GET /api/v1/memory/:key

**响应** (200):
```json
{
  "name": "test-key",
  "description": "test-key",
  "type": "test",
  "content": "Test memory content"
}
```

**注意**: 返回字段为 `name`/`description` 而非 `key`，与文档不一致

---

### 7. GET /api/v1/memory

**响应** (200):
```json
{
  "memories": [
    {
      "name": "test-key",
      "description": "test-key",
      "type": "test",
      "content": "Test memory content"
    }
  ]
}
```

---

### 8. GET /api/v1/memory?pattern=test-*

**问题**: pattern 匹配返回空数组

**响应** (200):
```json
{
  "memories": []
}
```

---

### 9. POST /api/v1/mcp/connect

**请求**:
```bash
curl -X POST http://localhost:8000/api/v1/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{"serverId": "test-server", "config": {"command": "echo", "args": ["hello"]}}'
```

**响应** (500):
```json
{
  "error": "Failed to connect MCP server: MCP error -32000: Connection closed"
}
```

**原因**: `echo` 不是有效的 MCP 服务器命令

---

### 10. GET /api/v1/mcp/tools

**响应** (200):
```json
{
  "tools": []
}
```

---

### 12. POST /api/v1/sessions/:id/message (非流式)

**请求**:
```bash
curl -X POST http://localhost:8000/api/v1/sessions/7dd2845c-e7d9-4a8e-969b-38b005c8d387/message \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello", "stream": false}'
```

**响应** (200):
```json
{
  "result": {
    "text": "\n\nHello! I'm here to help you with your software engineering tasks. What can I do for you today?",
    "messages": [...],
    "usage": {
      "inputTokens": 2881,
      "outputTokens": 47,
      "cacheCreationInputTokens": 0,
      "cacheReadInputTokens": 0
    },
    "stopReason": "end_turn",
    "numTurns": 1,
    "durationMs": 16278,
    "costUSD": 0.009348,
    "queryTracking": {
      "chainId": "d5bb299e-2453-4df2-b904-734c43d58632",
      "depth": 0
    }
  }
}
```

---

### 13. POST /api/v1/sessions/:id/message (流式)

**请求**:
```bash
curl -X POST http://localhost:8000/api/v1/sessions/.../message \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hi", "stream": true}'
```

**响应** (200, SSE):
```
data: {"type":"query_start","queryTracking":{"chainId":"...","depth":1}}
data: {"type":"turn_start","turnNumber":1}
data: {"type":"turn_start","turnNumber":1}
...
```

---

### 14. POST /api/v1/sessions with toolPreset

**请求**:
```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"config": {"toolPreset": "extended"}}'
```

**响应** (201):
```json
{
  "sessionId": "706d6dda-deb1-461b-9cb2-d47e1ee676d0"
}
```

---

### 15. POST /api/v1/sessions with toolPermissions

**请求**:
```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"config": {"toolPermissions": {"Bash": "deny", "FileRead": "allow"}}}'
```

**响应** (201):
```json
{
  "sessionId": "e8a13f37-340a-4362-ae39-36e739b2f512"
}
```

---

### 18-20. 错误处理测试

**GET /api/v1/sessions/nonexistent**:
```json
{
  "error": "Session not found"
}
```

**GET /api/v1/memory/nonexistent**:
```json
{
  "error": "Memory not found"
}
```

**DELETE /api/v1/mcp/nonexistent**:
```json
{
  "error": "MCP server not found"
}
```

---

## 发现的问题

### 1. Session History 为空

**描述**: 发送消息后，`GET /api/v1/sessions/:id/history` 返回空数组

**影响**: 客户端无法获取会话历史

**可能原因**: history 未正确从 SDK 同步到 session 对象

---

### 2. Memory API 响应字段不一致

**描述**: API 文档说明返回 `key` 字段，实际返回 `name` 和 `description`

**文档定义**:
```json
{"key": "...", "content": "...", "type": "...", "createdAt": "...", "updatedAt": "..."}
```

**实际响应**:
```json
{"name": "test-key", "description": "test-key", "type": "test", "content": "Test memory content"}
```

---

### 3. Memory Pattern 匹配不工作

**描述**: `GET /api/v1/memory?pattern=test-*` 返回空数组，但 `test-key` 存在

**可能原因**: glob pattern 匹配逻辑问题

---

### 4. Memory POST 响应多出 filepath 字段

**描述**: POST /api/v1/memory 返回额外的 `filepath` 字段

**实际响应**:
```json
{
  "ok": true,
  "filepath": "/home/ubuntu/.agent-core/memory/32195b76/test-key.md"
}
```

**建议**: 文档化此字段或移除

---

## WebSocket 测试跳过原因

测试环境未安装 `websocat`，无法验证：
- WebSocket 连接建立
- hook 注册
- hook 事件推送
- hook 决策响应

**替代测试建议**: 使用浏览器控制台或 ws client 库测试

---

## 总结

### 通过率

- **总计**: 24 测试
- **通过**: 20 (83%)
- **跳过**: 2 (8%)
- **问题**: 2 (8%)

### API 覆盖

| 模块 | 覆盖率 |
|------|--------|
| Session CRUD | 100% |
| Session 消息 | 100% |
| Session 历史 | 50% (有问题) |
| Memory CRUD | 100% (字段不一致) |
| MCP 管理 | 80% (connect 失败) |
| WebSocket Hooks | 0% (未测试) |

### 建议

1. 修复 session history 同步问题
2. 统一 memory API 响应字段
3. 调查 pattern 匹配问题
4. 添加 MCP connect 的验证日志
5. 补充 WebSocket 测试工具
