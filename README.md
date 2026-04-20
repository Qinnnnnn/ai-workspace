# AI Workspace

## 项目

### [codenano](./codenano/)

AI 编程 Agent SDK。

```typescript
import { createAgent, coreTools } from 'codenano'

const agent = createAgent({
  model: 'claude-sonnet-4-6',
  tools: coreTools(),
})

const result = await agent.ask('Read package.json and summarize it')
```

详细文档见 [codenano/README.md](./codenano/README.md)

### [codenano-api](./codenano-api/)

Node.js HTTP/WebSocket 服务，封装 codenano SDK。

```bash
cd codenano-api
npm install && npm run build
ANTHROPIC_AUTH_TOKEN=sk-ant-... npm start
```

详细文档见 [docs/codenano-api.md](./docs/codenano-api.md)

### [openspec](./openspec/)

变更管理系统。

## 文档

- [Codenano API](./docs/codenano.md) - API 文档
- [本地开发](./docs/local-development.md) - 开发指南
