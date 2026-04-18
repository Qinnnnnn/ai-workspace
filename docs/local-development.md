# 启动服务进行测试

## 环境要求

- Python 3.12+
- [bubblewrap](https://github.com/containers/bubblewrap)（沙箱隔离）

```bash
# 安装 bubblewrap
sudo apt install bubblewrap

# 验证
bwrap --version
```

## 环境变量配置

创建 `codenano-service/.env`:

```bash
ANTHROPIC_API_KEY=your-api-key-here
CODENANO_CLI_PATH=../codenano-cli/dist/index.js
SB_TTL_MINUTES=30
LOG_LEVEL=INFO
WORKSPACE_BASE_DIR=/tmp/host_sessions
```

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ANTHROPIC_API_KEY` | 是 | - | Anthropic API 密钥 |
| `CODENANO_CLI_PATH` | 否 | `../codenano-cli/dist/index.js` | codenano CLI 路径 |
| `SB_TTL_MINUTES` | 否 | `30` | Session 存活时间（分钟） |
| `LOG_LEVEL` | 否 | `INFO` | 日志级别 |
| `WORKSPACE_BASE_DIR` | 否 | `/tmp/host_sessions` | 工作空间根目录 |

## 启动服务

```bash
cd codenano-service
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后会：
1. 检查 `bwrap` 是否可用
2. 初始化 `SubprocessRegistry`
3. 启动 FastAPI 应用

## 验证服务运行

```bash
# 检查健康状态
curl http://localhost:8000/health

# 或直接访问 docs
open http://localhost:8000/docs
```

## 测试当前 API

服务启动后，可通过 `/docs` 页面或 curl 测试：

```bash
# 创建 session
curl -X POST http://localhost:8000/sessions

# 列出 session
curl http://localhost:8000/sessions

# 查看特定 session
curl http://localhost:8000/sessions/{session_id}
```

## 开发调试

```bash
# 开启 debug 日志
LOG_LEVEL=DEBUG uvicorn main:app --reload

# 查看详细错误
uvicorn main:app --reload --log-level debug
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
