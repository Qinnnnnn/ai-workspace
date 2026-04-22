import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Moon, PanelLeftClose, Plus, RefreshCcw, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ChatList } from '@/components/ChatList'
import { ThreadShell } from '@/components/thread/ThreadShell'
import { useSessions } from '@/hooks/useSessions'
import { useStream } from '@/hooks/useStream'
import { getSessionHistory } from '@/api/sessions'
import type { SessionSummary, StreamEvent, UIMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

const SIDEBAR_STORAGE_KEY = 'codenano-webui.sidebar'
const SIDEBAR_WIDTH = 279

function readSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

export default function App() {
  const { sessions, loading, refresh, create, remove } = useSessions()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(readSidebarOpen)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messageCacheRef = useRef<Map<string, UIMessage[]>>(new Map())
  const pendingFirstRef = useRef<string | null>(null)

  // History messages per session
  const [historyMessages, setHistoryMessages] = useState<Record<string, UIMessage[]>>({})

  // Per-session chat state
  const [sessionMessages, setSessionMessages] = useState<Record<string, UIMessage[]>>({})
  const [sessionStreaming, setSessionStreaming] = useState<Record<string, boolean>>({})

  // Active session
  const activeSession = useMemo<SessionSummary | null>(() => {
    if (!activeId) return null
    return sessions.find((s) => s.sessionId === activeId) ?? null
  }, [sessions, activeId])

  // Callbacks for streaming
  const streamCallbacks = useMemo(
    () => ({
      onText: (text: string) => {
        if (!activeId) return
        setSessionMessages((prev) => {
          const msgs = prev[activeId] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            return { ...prev, [activeId]: [...msgs.slice(0, -1), { ...last, content: last.content + text }] }
          }
          return {
            ...prev,
            [activeId]: [
              ...msgs,
              { id: crypto.randomUUID(), role: 'assistant', content: text, isStreaming: true, createdAt: Date.now() },
            ],
          }
        })
      },
      onThinking: (_text: string) => {
        // Could render thinking in a separate expandable section
      },
      onToolUse: (event: Extract<StreamEvent, { type: 'tool_use' }>) => {
        if (!activeId) return
        // Add a tool trace to current assistant message
        setSessionMessages((prev) => {
          const msgs = prev[activeId] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant') {
            return {
              ...prev,
              [activeId]: [
                ...msgs.slice(0, -1),
                {
                  ...last,
                  traces: [...(last.traces ?? []), `${event.toolName}(${JSON.stringify(event.input)})`],
                },
              ],
            }
          }
          return prev
        })
      },
      onToolResult: (_event: Extract<StreamEvent, { type: 'tool_result' }>) => {
        // Tool result is included in the trace
      },
      onDone: (finalText: string) => {
        if (!activeId) return
        setSessionMessages((prev) => {
          const msgs = prev[activeId] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            return { ...prev, [activeId]: [...msgs.slice(0, -1), { ...last, content: finalText, isStreaming: false }] }
          }
          return prev
        })
        setSessionStreaming((prev) => ({ ...prev, [activeId]: false }))
        // Cache updated messages
        if (activeId) {
          const msgs = sessionMessages[activeId] ?? []
          messageCacheRef.current.set(activeId, msgs)
        }
      },
      onError: (error: string) => {
        if (!activeId) return
        setSessionMessages((prev) => {
          const msgs = prev[activeId] ?? []
          return {
            ...prev,
            [activeId]: [
              ...msgs,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Error: ${error}`,
                isStreaming: false,
                createdAt: Date.now(),
              },
            ],
          }
        })
        setSessionStreaming((prev) => ({ ...prev, [activeId]: false }))
      },
    }),
    [activeId, sessionMessages],
  )

  const { send: doSend } = useStream(streamCallbacks)

  // Sidebar open state persistence
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, desktopSidebarOpen ? '1' : '0')
    } catch {
      // ignore
    }
  }, [desktopSidebarOpen])

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      if (next === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      try {
        window.localStorage.setItem('codenano-webui.theme', next)
      } catch {}
      return next
    })
  }, [])

  // Load history when switching to a session
  const loadHistory = useCallback(
    async (sessionId: string) => {
      if (historyMessages[sessionId]) return // already loaded
      setIsLoadingHistory(true)
      try {
        const res = await getSessionHistory(sessionId)
        const msgs: UIMessage[] = res.history.map((h, i) => {
          const role = h.role as 'user' | 'assistant'
          const content = typeof h.content === 'string' ? h.content : JSON.stringify(h.content)
          return { id: `${sessionId}-${i}`, role, content, createdAt: Date.now() }
        })
        setHistoryMessages((prev) => ({ ...prev, [sessionId]: msgs }))
        setSessionMessages((prev) => ({ ...prev, [sessionId]: msgs }))
      } catch (e) {
        // If history fails, start fresh
        setSessionMessages((prev) => ({ ...prev, [sessionId]: [] }))
      } finally {
        setIsLoadingHistory(false)
      }
    },
    [historyMessages],
  )

  // Select session
  const handleSelect = useCallback(
    async (sessionId: string) => {
      setActiveId(sessionId)
      setMobileSidebarOpen(false)
      if (!sessionMessages[sessionId] && !historyMessages[sessionId]) {
        await loadHistory(sessionId)
      } else if (historyMessages[sessionId] && !sessionMessages[sessionId]) {
        setSessionMessages((prev) => ({ ...prev, [sessionId]: historyMessages[sessionId] }))
      }
    },
    [loadHistory, historyMessages, sessionMessages],
  )

  // Create new chat
  const handleNewChat = useCallback(async (): Promise<string | null> => {
    const id = await create()
    if (id) {
      setActiveId(id)
      setSessionMessages((prev) => ({ ...prev, [id]: [] }))
      setMobileSidebarOpen(false)
    }
    return id
  }, [create])

  // Send message
  const handleSend = useCallback(
    async (content: string) => {
      if (!activeId) return
      const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: Date.now() }
      setSessionMessages((prev) => ({
        ...prev,
        [activeId]: [...(prev[activeId] ?? []), userMsg],
      }))
      setSessionStreaming((prev) => ({ ...prev, [activeId]: true }))
      await doSend(activeId, content)
    },
    [activeId, doSend],
  )

  // Welcome composer sends before session exists
  const handleWelcomeSend = useCallback(
    async (content: string) => {
      pendingFirstRef.current = content
      const newId = await handleNewChat()
      if (!newId) {
        pendingFirstRef.current = null
      }
    },
    [handleNewChat],
  )

  // Flush pending first message after session created
  useEffect(() => {
    if (!activeId || !pendingFirstRef.current) return
    const content = pendingFirstRef.current
    pendingFirstRef.current = null
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: Date.now() }
    setSessionMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), userMsg],
    }))
    setSessionStreaming((prev) => ({ ...prev, [activeId]: true }))
    doSend(activeId, content)
  }, [activeId, doSend])

  // Delete session
  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    const { id } = pendingDelete
    setPendingDelete(null)
    const wasActive = activeId === id
    const idx = sessions.findIndex((s) => s.sessionId === id)
    const fallback = sessions[idx + 1] ?? sessions[idx - 1]
    if (wasActive) setActiveId(fallback?.sessionId ?? null)
    await remove(id)
  }, [pendingDelete, activeId, sessions, remove])

  // Title
  const headerTitle = activeSession
    ? activeSession.sessionId.slice(0, 8)
    : 'codenano'

  const sidebarProps = {
    sessions,
    activeId,
    loading,
    theme,
    onToggleTheme: toggleTheme,
    onNewChat: () => void handleNewChat(),
    onSelect: handleSelect,
    onRefresh: () => void refresh(),
    onRequestDelete: (id: string, label: string) => setPendingDelete({ id, label }),
  }

  const currentMessages = activeId ? (sessionMessages[activeId] ?? []) : []
  const isCurrentlyStreaming = activeId ? (sessionStreaming[activeId] ?? false) : false

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'relative z-20 hidden shrink-0 overflow-hidden lg:block',
        )}
        style={{ width: desktopSidebarOpen ? SIDEBAR_WIDTH : 0 }}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 h-full w-[279px] overflow-hidden bg-sidebar shadow-inner-right',
            'transition-transform duration-300 ease-out',
            desktopSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarInner {...sidebarProps} onCollapse={() => setDesktopSidebarOpen(false)} />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => setMobileSidebarOpen(open)}>
        <SheetContent showCloseButton={false} className="w-[279px] p-0 sm:max-w-[279px] lg:hidden">
          <SidebarInner {...sidebarProps} onCollapse={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex h-full min-w-0 flex-1 flex-col">
        <ThreadShell
          session={activeSession}
          title={headerTitle}
          onToggleSidebar={() => {
            const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
            if (isDesktop) {
              setDesktopSidebarOpen((v) => !v)
            } else {
              setMobileSidebarOpen((v) => !v)
            }
          }}
          onGoHome={() => setActiveId(null)}
          onNewChat={handleNewChat}
          messages={currentMessages}
          isStreaming={isCurrentlyStreaming}
          isLoadingHistory={isLoadingHistory}
          onSend={activeSession ? handleSend : handleWelcomeSend}
          modelLabel="claude-sonnet-4-6"
        />
      </main>

      {/* Delete confirm */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border p-6 shadow-lg max-w-sm mx-auto">
            <h2 className="text-lg font-semibold mb-2">Delete conversation?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete "{pendingDelete.label}"? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleConfirmDelete()}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inner sidebar component
interface SidebarInnerProps {
  sessions: SessionSummary[]
  activeId: string | null
  loading: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onNewChat: () => void
  onSelect: (id: string) => void
  onRefresh: () => void
  onRequestDelete: (id: string, label: string) => void
  onCollapse: () => void
}

function SidebarInner({
  sessions,
  activeId,
  loading,
  theme,
  onToggleTheme,
  onNewChat,
  onSelect,
  onRefresh,
  onRequestDelete,
  onCollapse,
}: SidebarInnerProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-sidebar-border/70 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="px-2 pb-2.5">
        <Button
          onClick={onNewChat}
          className="h-8.5 w-full justify-start gap-2 rounded-lg border border-sidebar-border/80 bg-card/25 px-3 text-[13px] font-medium text-sidebar-foreground shadow-none hover:bg-sidebar-accent/80"
          variant="outline"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>
      <Separator className="bg-sidebar-border/70" />
      <div className="flex items-center justify-between px-2.5 py-2 text-[11px] font-medium text-muted-foreground">
        <span>Recent</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onRefresh}
          aria-label="Refresh sessions"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatList
          sessions={sessions}
          activeId={activeId}
          loading={loading}
          onSelect={onSelect}
          onRequestDelete={onRequestDelete}
        />
      </div>
    </aside>
  )
}
