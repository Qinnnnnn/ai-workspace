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

### [openspec](./openspec/)

Experimental change management system. See `openspec/config.yaml` for configuration.
