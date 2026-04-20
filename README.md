# AI Workspace

个人开发环境，用于构建 AI 原生应用。

## 项目

### [codenano](./codenano/)

轻量级 AI 编程 Agent SDK（约 8,000 行代码，MIT 许可）。

```typescript
import { createAgent, coreTools } from 'codenano'

const agent = createAgent({
  model: 'claude-sonnet-4-6',
  tools: coreTools(),
})

const result = await agent.ask('Read package.json and summarize it')
```

**功能：** Agent 循环、17 个内置工具、会话持久化、记忆系统、MCP 支持、流式输出、生命周期钩子、成本追踪、Git 集成。

详细文档见 [codenano/README.md](./codenano/README.md)

### [codenano-api](./codenano-api/)

基于 Node.js + Fastify 的 HTTP/WebSocket 服务，封装 codenano SDK。提供会话管理、SSE 流式响应、工具权限控制。

```bash
cd codenano-api
npm install && npm run build
ANTHROPIC_AUTH_TOKEN=sk-ant-... npm start
```

**API 端点：**
- `POST /api/v1/sessions` - 创建会话
- `POST /api/v1/sessions/:id/message` - 发送消息（SSE 流式）
- `GET /api/v1/sessions/:id/history` - 获取对话历史
- `DELETE /api/v1/sessions/:id` - 删除会话

详细文档见 [docs/codenano-api.md](./docs/codenano-api.md)

### [openspec](./openspec/)

实验性变更管理系统。配置见 `openspec/config.yaml`。

## 文档

- [Codenano API](./docs/codenano-api.md) - 完整 API 文档
- [本地开发](./docs/local-development.md) - 本地启动和测试指南
