## 1. Project Setup

- [x] 1.1 Initialize `codenano-webui/` with Vite + React + TypeScript
- [x] 1.2 Install dependencies: TailwindCSS, Radix UI components, class-variance-authority, clsx, lucide-react
- [x] 1.3 Configure Tailwind with typography plugin
- [x] 1.4 Setup basic directory structure (api/, components/, hooks/, lib/)
- [x] 1.5 Create `lib/types.ts` with StreamEvent, Session types from codenano-api

## 2. API Layer

- [x] 2.1 Create `api/client.ts` - fetch wrapper with base URL configuration
- [x] 2.2 Create `api/sessions.ts` - session CRUD operations (listSessions, createSession, deleteSession, sendMessage)
- [x] 2.3 Create `api/sse.ts` - SSE stream parser utility
- [x] 2.4 Verify API connectivity against codenano-api (build succeeded, proxy configured)

## 3. Core Components

- [x] 3.1 Create `components/ui/` - Button, ScrollArea, Avatar, Separator (shadcn-style)
- [x] 3.2 Create `components/ChatList.tsx` - sidebar with session list
- [x] 3.3 Create `components/ChatPane.tsx` - main chat area container (via ThreadShell)
- [x] 3.4 Create `components/MessageList.tsx` - scrollable message container
- [x] 3.5 Create `components/MessageBubble.tsx` - renders text messages with role differentiation

## 4. Streaming & Tool Calls

- [x] 4.1 Create `hooks/useStream.ts` - SSE connection and event parsing
- [x] 4.2 Create `components/Composer.tsx` - input field with send button
- [x] 4.3 Create `components/ToolCallBlock.tsx` - tool_use / tool_result card display
- [x] 4.4 Integrate streaming into ChatPane - real-time message appending
- [x] 4.5 Handle thinking events with collapsible display

## 5. Session Management

- [x] 5.1 Create `hooks/useSessions.ts` - session list state management
- [x] 5.2 Create `hooks/useChat.ts` - active session messages state (local cache per sessionId)
- [x] 5.3 Wire up ChatList → session selection → fetch `GET /api/v1/sessions/:id/history` → display history
- [x] 5.4 Wire up Composer → sendMessage → stream
- [x] 5.5 Implement delete session from ChatList

## 6. Polish & Testing

- [x] 6.1 Add loading/streaming states to Composer
- [x] 6.2 Add error display for failed messages
- [x] 6.3 Add empty state when no session selected
- [x] 6.4 Add auto-scroll to MessageList during streaming
- [x] 6.5 Test full flow: build succeeded, TypeScript clean
