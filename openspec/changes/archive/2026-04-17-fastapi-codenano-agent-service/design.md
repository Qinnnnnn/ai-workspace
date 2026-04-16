## Context

codenano 是一个 TypeScript SDK，提供完整的 agent loop、tool execution、session persistence 等能力。本项目将其包装为 HTTP 服务，用 FastAPI 提供 REST API + SSE 流式响应。

**运行环境**：EC2 Linux，直接命令行启动（不用 Docker）。

**启动方式**：
```bash
# 终端 1
cd codenano-cli && npm install && npm run build
node dist/index.js

# 终端 2
cd fastapi && pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**技术栈**：Python (FastAPI) + TypeScript (codenano CLI) + Linux (bwrap)

## Goals / Non-Goals

**Goals:**
- HTTP API + SSE 流式响应
- 多 session 并发，session 之间隔离
- bwrap 沙箱限制文件系统访问和网络
- 命令行直接启动，最小化依赖

**Non-Goals:**
- Docker 部署
- 用户认证（依赖内网隔离）
- 持久化数据库（session 状态用 codenano JSONL）
- 高并发（几十个内部用户，按需创建）
- codenano 代码改造

## Decisions

### 1. FastAPI ↔ codenano：subprocess + JSON-RPC 2.0

codenano 作为 long-running subprocess，FastAPI 通过 stdin/stdout 的 JSON-RPC 2.0 与其通信。

**JSON-RPC 接口**：
```
CLI → FastAPI (notifications):
  {"jsonrpc":"2.0","method":"stream","params":{"type":"<event-type>","data":{...}}}

FastAPI → CLI (requests):
  {"jsonrpc":"2.0","id":1,"method":"init","params":{"config":{...}}}
  {"jsonrpc":"2.0","id":2,"method":"send","params":{"sessionId":"...","prompt":"..."}}
  {"jsonrpc":"2.0","id":3,"method":"close","params":{"sessionId":"..."}}
  {"jsonrpc":"2.0","id":4,"method":"history","params":{"sessionId":"..."}}
  {"jsonrpc":"2.0","id":5,"method":"list_sessions","params":{}}
```

### 2. Session 生命周期

每个 API session = 一个 CLI subprocess。session 结束则进程退出，bwrap 沙箱自动清理。

```
创建 session:
  1. 生成 UUID
  2. 启动 CLI subprocess (bwrap)
  3. CLI init Agent + 创建 codenano Session
  4. 返回 session_id

发送消息:
  FastAPI → CLI: send(sessionId, prompt)
  CLI → FastAPI: stream notifications
  FastAPI → Client: SSE push

关闭 session:
  CLI: session 保存 + 进程退出
```

**TTL**：30 分钟无消息自动清理。

### 3. bwrap 沙箱

每个 CLI subprocess 在 bwrap 环境中启动：
- 只读绑定系统目录
- session 工作目录为 tmpfs（内存文件系统）
- 无网络
- 新建 PID/UTS namespace

```bash
bwrap \
  --unshare-user --unshare-pid --unshare-uts \
  --ro-bind /usr /usr \
  --ro-bind /lib /lib \
  --ro-bind /bin /bin \
  --tmpfs /tmp/sandbox/{session_id} \
  --chdir /tmp/sandbox/{session_id} \
  --dev /dev \
  --nodev /sys \
  --ro-bind /etc/resolv.conf /etc/resolv.conf \
  node codenano-cli/dist/index.js
```

### 4. 项目结构

```
.
├── codenano-cli/               # TypeScript CLI
│   ├── src/
│   │   ├── index.ts           # CLI 入口，JSON-RPC server
│   │   ├── rpc-server.ts     # JSON-RPC 2.0 over stdio
│   │   └── rpc-types.ts      # 类型定义
│   ├── package.json
│   └── tsconfig.json
│
└── fastapi/                    # Python FastAPI 服务
    ├── main.py                # FastAPI app
    ├── config.py               # .env 配置读取
    ├── rpc_client.py           # JSON-RPC subprocess client
    ├── session_manager.py       # subprocess 生命周期
    ├── sandbox.py              # bwrap wrapper
    ├── routes/
    │   └── sessions.py         # REST endpoints
    └── requirements.txt
```

### 5. API 设计

```
POST   /api/v1/sessions              创建 session
GET    /api/v1/sessions              列出所有 sessions
GET    /api/v1/sessions/{id}         获取 session 状态
POST   /api/v1/sessions/{id}/message 发送消息 (SSE 流式响应)
DELETE /api/v1/sessions/{id}         关闭 session
GET    /api/v1/sessions/{id}/history 获取对话历史
```

**SSE 事件**：同 codenano StreamEvent 类型映射：
```
event: turn_start     → {"turnNumber": N}
event: tool_use       → {"toolName": "...", "toolUseId": "...", "input": {...}}
event: tool_result    → {"toolUseId": "...", "output": "...", "isError": false}
event: text           → {"text": "..."}
event: thinking       → {"thinking": "..."}
event: result         → {"text": "...", "numTurns": N, "costUSD": 0.00}
event: error          → {"error": "..."}
```

### 6. 配置 (.env)

```
ANTHROPIC_API_KEY=sk-ant-...
CODENANO_CLI_PATH=../codenano-cli/dist/index.js
SB_TTL_MINUTES=30
LOG_LEVEL=INFO
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 无认证导致服务完全开放 | 仅限内网访问 |
| bwrap 未安装 | 服务启动时检测并报错 |
| CLI subprocess 无响应 | 添加 timeout，强制 kill |
| codenano crash | subprocess 隔离，crash 不影响其他 session |
