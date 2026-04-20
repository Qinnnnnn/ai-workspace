# Codenano API 本地开发

## 环境要求

- Node.js 18+
- bubblewrap: `sudo apt install bubblewrap && bwrap --version`

## 启动服务

```bash
cd codenano-api && npm install && npm run build
cp .env.example .env  # 编辑填入 ANTHROPIC_AUTH_TOKEN
npm run start
```

## Workspace 隔离

每个 session 有独立 workspace：`~/.codenano/workspaces/{session_id}/`

- Agent 根目录 `/` 即为 workspace
- 文件操作（Read/Write/Edit/Glob/Grep/Bash）自动验证路径
- Session 销毁时 workspace 递归删除

## 测试

```bash
# 创建 session
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"config": {"model": "claude-sonnet-4-6"}}'

# 发送消息（流式）
curl -X POST http://localhost:8000/api/v1/sessions/{id}/message \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "stream": true}'
```

## bwrap 权限问题

`bwrap: setting up uid map: Permission denied` 时：

```bash
sudo sysctl -w kernel.unprivileged_userns_clone=1
```

或 sudo 运行。

## 常见错误

| 错误 | 解决 |
|------|------|
| `ANTHROPIC_AUTH_TOKEN is required` | 检查 .env 文件 |
| `bwrap is not available` | `apt install bubblewrap` |
