## Context

codenano-api 是一个 Fastify HTTP 服务，提供基于 SSE 的流式响应和 REST API 会话管理。现有的 `webui` 是基于旧版 WebSocket 协议设计的，与 codenano-api 的 SSE + REST 架构不匹配。

需要构建一个全新的 React WebUI，直接对接 codenano-api，不做任何适配层。

## Goals / Non-Goals

**Goals:**
- 完整的对话 UI：会话列表、新建会话、消息发送、实时流式响应
- 工具调用卡片展示（tool_use / tool_result 事件可视化）
- 优雅的流式消息渲染（逐字显示 + 闪烁光标）
- 技术栈：React 18 + Vite + TypeScript + TailwindCSS + Radix UI
- 纯对话功能，不包含管理面板
- **视觉风格完全参考 webui**：配色、间距、动画、字体完全复用

**Non-Goals:**
- 工具权限管理 UI
- 模型/MCP 配置 UI
- Memory/Skills 管理
- 不兼容现有 webui（代码独立）

## Decisions

### 1. 视觉设计语言（参考 webui）

**完全复用 webui 的样式体系，CSS 变量、色值、组件样式均保持一致。**

**主题色**: CSS 变量 + hsl 格式，支持 light/dark mode

```css
/* sidebar 配色 */
--sidebar: 0 0% 98%;
--sidebar-foreground: 0 0% 3.9%;
--sidebar-accent: 0 0% 96.1%;
--sidebar-border: 0 0% 89.8%;

/* 主色 */
--background: 0 0% 100%;
--foreground: 0 0% 3.9%;
--primary: 0 0% 9%;
--muted: 0 0% 96%;
--border: 0 0% 89.8%;
```

**Sidebar**: 固定 279px 宽，左侧边栏带 logo、New Chat 按钮、会话列表、主题切换、ConnectionBadge

**Composer**: `rounded-[24px]` hero 样式 + `rounded-[16px]` thread 样式，自动增高 textarea，Enter 发送，Shift+Enter 换行，模型标签 badge

**MessageBubble**:
- User: 右对齐圆角药丸 `rounded-[18px]`，带阴影 `shadow-[0_10px_24px_-18px_rgba(0,0,0,0.55)]`
- Assistant: Markdown prose，不带气泡，fade+slide 动画，streaming 时闪烁光标

**ToolCallBlock**:
- 折叠组形式，`Wrench` 图标 + `ChevronRight` 展开指示器
- 左 border + 缩进列表展示工具调用链
- `TraceGroup` 样式复用

**CodeBlock**: Prism 语法高亮，oneDark/oneLight 主题，语言标签 + 复制按钮

**Markdown 渲染**: `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `react-syntax-highlighter`

**动画**: `animate-in fade-in-0 slide-in-from-bottom-1 duration-300`，streaming 时 `animate-pulse` 光标

**字体**: System font stack，JetBrains Mono 等宽字体，完整 CJK 支持

### 2. API 通信模式：SSE 直接读取

**决定**: 使用 `fetch` + `ReadableStream` 直接读取 SSE

```typescript
const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/message`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, stream: true }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // 解析 SSE: data: {"type":"text",...}\n\n
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      // 分发到 UI 状态
    }
  }
}
```

**替代方案**:
- EventSource API：只支持 GET，不支持 POST 发送消息
- 第三方 SSE 库：增加依赖，直接用 ReadableStream 足够

### 3. 状态管理

**决定**: 使用 React hooks 管理状态，不引入 Zustand/Redux

```typescript
// 核心状态
interface ChatState {
  messages: UIMessage[];
  isStreaming: boolean;
  currentToolUse: { toolName: string; toolUseId: string; input: unknown } | null;
}
```

### 4. 目录结构

```
codenano-webui/src/
├── api/
│   ├── client.ts      # fetch 封装 + Base URL
│   ├── sessions.ts    # REST API 调用
│   └── types.ts      # codenano-api StreamEvent 类型
├── components/
│   ├── ChatList.tsx   # Sidebar 会话列表
│   ├── ChatPane.tsx   # 主聊天区 (含 welcome + thread 状态)
│   ├── MessageList.tsx # 滚动消息容器 + auto-scroll + 渐变
│   ├── MessageBubble.tsx # 消息渲染 (user pill / assistant markdown)
│   ├── ThreadComposer.tsx # webui 风格输入框
│   ├── ToolCallBlock.tsx  # 工具调用折叠卡片
│   ├── CodeBlock.tsx      # 语法高亮代码块
│   ├── MarkdownText.tsx   # Markdown 渲染 (lazy load)
│   ├── MarkdownTextRenderer.tsx
│   ├── thread/
│   │   ├── ThreadShell.tsx
│   │   └── ThreadHeader.tsx
│   └── ui/            # Radix UI 包装组件
│       ├── button.tsx
│       ├── scroll-area.tsx
│       ├── dropdown-menu.tsx
│       ├── separator.tsx
│       └── sheet.tsx
├── hooks/
│   ├── useSessions.ts   # 会话列表 state
│   ├── useChat.ts       # 当前会话消息 state
│   └── useStream.ts     # SSE 流式读取 + 事件解析
├── lib/
│   ├── utils.ts        # cn() helper (clsx + tailwind-merge)
│   └── format.ts       # relativeTime 等格式化
├── App.tsx             # 根组件，布局 Shell
├── main.tsx
└── index.css          # CSS 变量定义，dark mode，tailwind
```

### 5. 技术栈依赖

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "react-syntax-highlighter": "^15.6.1",
    "rehype-katex": "^7.0.1",
    "remark-gfm": "^4.0.0",
    "remark-math": "^6.0.0",
    "lucide-react": "^0.469.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-slot": "^1.1.1"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.17",
    "@tailwindcss/typography": "^0.5.19",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| SSE 解析边界（chunk 可能包含多个 data: 行） | 累积 buffer，行边界处理 |
| 流式消息与历史消息状态同步 | 完成后一次性写入状态 |
| Session 创建与消息发送的顺序依赖 | UI 流程保证先建会话再发消息 |

## Open Questions

- 是否需要支持断线重连？（会话持久化到 localStorage）
- 是否需要展示 token 用量/cost？（codenano-api 有 /api/v1/cost/calculate）
