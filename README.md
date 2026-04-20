# AI Workspace

Personal development environment for building AI-native applications.

## Projects

### [codenano](./codenano/)

Lightweight AI coding agent SDK (~8,000 lines, MIT licensed).

```typescript
import { createAgent, coreTools } from 'codenano'

const agent = createAgent({
  model: 'claude-sonnet-4-6',
  tools: coreTools(),
})

const result = await agent.ask('Read package.json and summarize it')
```

**Features:** Agent loop, 17 built-in tools, session persistence, memory system, MCP support, streaming, lifecycle hooks, cost tracking, git integration.

See [codenano/README.md](./codenano/README.md) for full documentation.

### [codenano-api](./codenano-api/)

Node.js Fastify HTTP/WebSocket service wrapping codenano SDK. Provides session management, SSE streaming, and tool permission control.

```bash
cd codenano-api
npm install && npm run build
ANTHROPIC_AUTH_TOKEN=sk-ant-... npm start
```

**API Endpoints:**
- `POST /api/v1/sessions` - Create session
- `POST /api/v1/sessions/:id/message` - Send message (SSE streaming)
- `GET /api/v1/sessions/:id/history` - Get conversation history
- `DELETE /api/v1/sessions/:id` - Delete session

See [docs/codenano-api.md](./docs/codenano-api.md) for full API reference.

### [openspec](./openspec/)

Experimental change management system. See `openspec/config.yaml` for configuration.

## Documentation

- [Codenano API](./docs/codenano-api.md) - Complete API reference
- [Local Development](./docs/local-development.md) - Setup and run codenano-api
