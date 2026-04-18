# 启动服务进行测试

## 环境要求

- Python 3.12+
- Node.js 18+
- [bubblewrap](https://github.com/containers/bubblewrap)（沙箱隔离）

```bash
# 安装 bubblewrap
sudo apt install bubblewrap

# 验证
bwrap --version
```

## 构建依赖

codenano-cli 需要先构建：

```bash
# 构建 codenano 核心
cd codenano
npm install && npm run build

# 构建 CLI
cd ../codenano-cli
npm install && npm run build
```

## 环境变量配置

创建 `codenano-service/.env`:

```bash
ANTHROPIC_API_KEY=your-api-key-here
# 可选：自定义 API 端点（如代理服务器）
# ANTHROPIC_BASE_URL=https://api.anthropic.com
CODENANO_CLI_PATH=../codenano-cli/dist/index.js
SB_TTL_MINUTES=30
LOG_LEVEL=INFO
WORKSPACE_BASE_DIR=/tmp/host_sessions
```

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ANTHROPIC_API_KEY` | 是 | - | Anthropic API 密钥 |
| `ANTHROPIC_BASE_URL` | 否 | - | 自定义 API 端点（如代理服务器） |
| `CODENANO_CLI_PATH` | 否 | `../codenano-cli/dist/index.js` | codenano CLI 路径 |
| `SB_TTL_MINUTES` | 否 | `30` | Session 存活时间（分钟） |
| `LOG_LEVEL` | 否 | `INFO` | 日志级别 |
| `WORKSPACE_BASE_DIR` | 否 | `/tmp/host_sessions` | 工作空间根目录 |

## 启动服务

```bash
cd codenano-service
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后会：
1. 检查 `bwrap` 是否可用
2. 初始化 `SubprocessRegistry`
3. 启动 FastAPI 应用

## 验证服务运行

```bash
# 访问 API 文档
open http://localhost:8000/docs
```

## API 参考

### 创建 Session

```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "systemPrompt": "你是一个有帮助的助手",
    "maxOutputTokens": 16384,
    "thinkingConfig": "disabled"
  }'
```

**支持的参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | Claude 模型，默认 `claude-sonnet-4-6` |
| `systemPrompt` | string | 系统提示词 |
| `overrideSystemPrompt` | string | 完全替换系统提示词 |
| `appendSystemPrompt` | string | 追加到系统提示词末尾 |
| `maxOutputTokens` | number | 最大输出 token 数 |
| `thinkingConfig` | string | `adaptive` 或 `disabled` |

### 发送消息

```bash
# 流式响应（默认）
curl -X POST http://localhost:8000/api/v1/sessions/{session_id}/message \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello"}'

# 非流式响应
curl -X POST http://localhost:8000/api/v1/sessions/{session_id}/message \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello", "stream": false}'
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
# 开启 debug 日志
LOG_LEVEL=DEBUG uv run uvicorn main:app --reload

# 查看详细错误
uv run uvicorn main:app --reload --log-level debug
```

## 常见问题

### bwrap 不可用

```
RuntimeError: bwrap is not installed. Install with: sudo apt install bubblewrap
```

**解决**: 安装 bubblewrap

```bash
sudo apt install bubblewrap
```

### ANTHROPIC_API_KEY 未设置

```
ValueError: Required environment variable not set: ANTHROPIC_API_KEY
```

**解决**: 确保 `.env` 文件存在且包含有效的 API key
