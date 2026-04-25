import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { uuid } from '@/lib/uuid'
import { Moon, PanelLeftClose, Plus, RefreshCcw, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ChatList } from '@/components/ChatList'
import { ThreadShell } from '@/components/thread/ThreadShell'
import { useSessions } from '@/hooks/useSessions'
import { useStream } from '@/hooks/useStream'
import { getSessionHistory } from '@/api/sessions'
import type { ContentBlock, SessionSummary, StreamEvent, UIMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { i18n } from '@/lib/i18n'

const SIDEBAR_STORAGE_KEY = 'codenano-webui.sidebar'

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
  const { sessions, loading, error, refresh, create, remove, clearError } = useSessions()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(readSidebarOpen)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const thinkingActiveRef = useRef(false)
  const streamSessionRef = useRef<string | null>(null)
  const pendingTextRef = useRef('')
  const drainingRef = useRef<number | false>(false)

  const [historyMessages, setHistoryMessages] = useState<Record<string, UIMessage[]>>({})
  const [sessionMessages, setSessionMessages] = useState<Record<string, UIMessage[]>>({})
  const [sessionStreaming, setSessionStreaming] = useState<Record<string, boolean>>({})

  const activeSession = useMemo<SessionSummary | null>(() => {
    if (!streamSessionRef.current) return null
    return sessions.find((s) => s.sessionId === activeId) ?? null
  }, [sessions, activeId])

  const drainPendingText = () => {
    if (!streamSessionRef.current) return
    if (drainingRef.current) return
    drainingRef.current = 1
    const sessionId = streamSessionRef.current

    const drain = () => {
      if (!drainingRef.current || !sessionId) return
      if (!pendingTextRef.current) {
        drainingRef.current = false
        return
      }
      const char = pendingTextRef.current[0]
      if (char) {
        pendingTextRef.current = pendingTextRef.current.slice(1)
        setSessionMessages((prev) => {
          const msgs = prev[sessionId] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            const content = Array.isArray(last.content) ? last.content : [{ type: 'text' as const, text: last.content }]
            const lastBlock = content[content.length - 1]
            if (lastBlock && lastBlock.type === 'text') {
              lastBlock.text += char
            } else {
              content.push({ type: 'text', text: char })
            }
            return { ...prev, [sessionId]: [...msgs.slice(0, -1), { ...last, content }] }
          }
          return prev
        })
        drainingRef.current = requestAnimationFrame(drain)
      } else {
        drainingRef.current = false
      }
    }

    drainingRef.current = requestAnimationFrame(drain)
  }

  const streamCallbacks = useMemo(
    () => ({
      onText: (text: string) => {
        thinkingActiveRef.current = false
        if (!streamSessionRef.current) return
        pendingTextRef.current += text
        if (!drainingRef.current) {
          drainPendingText()
        }
      },
      onThinking: (thinking: string) => {
        if (!streamSessionRef.current) return
        setSessionMessages((prev) => {
          const msgs = prev[streamSessionRef.current!] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            const content = Array.isArray(last.content) ? [...last.content] : [{ type: 'text' as const, text: String(last.content) }]
            if (thinkingActiveRef.current) {
              const lastThinkingIdx = content.findLastIndex((b: ContentBlock) => b.type === 'thinking')
              if (lastThinkingIdx !== -1) {
                (content[lastThinkingIdx] as Extract<ContentBlock, { type: 'thinking' }>).thinking += thinking
              } else {
                content.push({ type: 'thinking', thinking })
              }
            } else {
              content.push({ type: 'thinking', thinking })
              thinkingActiveRef.current = true
            }
            return { ...prev, [streamSessionRef.current!]: [...msgs.slice(0, -1), { ...last, content }] }
          }
          thinkingActiveRef.current = true
          return {
            ...prev,
            [streamSessionRef.current!]: [
              ...msgs,
              { id: uuid(), role: 'assistant', content: [{ type: 'thinking', thinking }], isStreaming: true, createdAt: Date.now() },
            ],
          }
        })
      },
      onToolUse: (event: Extract<StreamEvent, { type: 'tool_use' }>) => {
        thinkingActiveRef.current = false  // 遇到 tool_use 说明 thinking 结束
        if (!streamSessionRef.current) return
        setSessionMessages((prev) => {
          const msgs = prev[streamSessionRef.current!] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            const content = Array.isArray(last.content) ? [...last.content] : [{ type: 'text' as const, text: String(last.content) }]
            const existingIdx = content.findIndex((b) => b.type === 'tool_use' && b.id === event.toolUseId)
            if (existingIdx !== -1) {
              const existing = content[existingIdx] as Extract<ContentBlock, { type: 'tool_use' }>
              content[existingIdx] = { ...existing, name: event.toolName, input: event.input }
            } else {
              content.push({ type: 'tool_use', id: event.toolUseId, name: event.toolName, input: event.input })
            }
            return { ...prev, [streamSessionRef.current!]: [...msgs.slice(0, -1), { ...last, content }] }
          }
          return {
            ...prev,
            [streamSessionRef.current!]: [
              ...msgs,
              { id: uuid(), role: 'assistant', content: [{ type: 'tool_use', id: event.toolUseId, name: event.toolName, input: event.input }], isStreaming: true, createdAt: Date.now() },
            ],
          }
        })
      },
      onToolResult: (event: Extract<StreamEvent, { type: 'tool_result' }>) => {
        thinkingActiveRef.current = false  // 遇到 tool_result 说明 thinking 结束
        if (!streamSessionRef.current) return
        setSessionMessages((prev) => {
          const msgs = prev[streamSessionRef.current!] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming && Array.isArray(last.content)) {
            const content = [...last.content]
            const toolIdx = content.findIndex((b) => b.type === 'tool_use' && b.id === event.toolUseId)
            if (toolIdx !== -1) {
              const toolBlock = content[toolIdx] as Extract<ContentBlock, { type: 'tool_use' }>
              content[toolIdx] = { ...toolBlock, result: { tool_use_id: event.toolUseId, content: event.output, is_error: event.isError } }
            }
            return { ...prev, [streamSessionRef.current!]: [...msgs.slice(0, -1), { ...last, content }] }
          }
          return prev
        })
      },
      onQueryStart: () => {
        thinkingActiveRef.current = false  // 新查询开始，重置 thinking 状态
      },
      onTurnStart: () => {
        thinkingActiveRef.current = false  // 新 turn 开始，重置 thinking 状态
      },
      onTurnEnd: () => {
        thinkingActiveRef.current = false  // turn 结束，thinking 也结束
      },
      onDone: () => {
        thinkingActiveRef.current = false
        if (!streamSessionRef.current) return
        const sessionId = streamSessionRef.current
        // Drain all remaining text at once
        if (pendingTextRef.current) {
          const remaining = pendingTextRef.current
          pendingTextRef.current = ''
          drainingRef.current = false
          setSessionMessages((prev) => {
            const msgs = prev[sessionId] ?? []
            const last = msgs[msgs.length - 1]
            if (last && last.role === 'assistant' && last.isStreaming) {
              const content = Array.isArray(last.content) ? last.content : [{ type: 'text' as const, text: last.content }]
              const lastBlock = content[content.length - 1]
              if (lastBlock && lastBlock.type === 'text') {
                lastBlock.text += remaining
              } else {
                content.push({ type: 'text', text: remaining })
              }
              return { ...prev, [sessionId]: [...msgs.slice(0, -1), { ...last, content, isStreaming: false }] }
            }
            return prev
          })
        } else {
          drainingRef.current = false
          setSessionMessages((prev) => {
            const msgs = prev[sessionId] ?? []
            const last = msgs[msgs.length - 1]
            if (last && last.role === 'assistant' && last.isStreaming) {
              return { ...prev, [sessionId]: [...msgs.slice(0, -1), { ...last, isStreaming: false }] }
            }
            return prev
          })
        }
        setSessionStreaming((prev) => ({ ...prev, [sessionId]: false }))
      },
      onError: (error: string) => {
        thinkingActiveRef.current = false
        if (!streamSessionRef.current) return
        const sessionId = streamSessionRef.current
        drainingRef.current = false
        const remaining = pendingTextRef.current
        pendingTextRef.current = ''
        setSessionMessages((prev) => {
          const msgs = prev[sessionId] ?? []
          const last = msgs[msgs.length - 1]
          const content = remaining
            ? [{ type: 'text' as const, text: remaining }, { type: 'text' as const, text: `Error: ${error}` }]
            : [{ type: 'text' as const, text: `Error: ${error}` }]
          if (last && last.role === 'assistant' && last.isStreaming) {
            const lastContent = Array.isArray(last.content) ? last.content : [{ type: 'text' as const, text: String(last.content) }]
            const lastBlock = lastContent[lastContent.length - 1]
            if (lastBlock && lastBlock.type === 'text' && remaining) {
              lastBlock.text += remaining
            }
            return {
              ...prev,
              [sessionId]: [...msgs.slice(0, -1), { ...last, content: [...lastContent, ...content], isStreaming: false }],
            }
          }
          return {
            ...prev,
            [sessionId]: [
              ...msgs,
              {
                id: uuid(),
                role: 'assistant',
                content,
                isStreaming: false,
                createdAt: Date.now(),
              },
            ],
          }
        })
        setSessionStreaming((prev) => ({ ...prev, [sessionId]: false }))
      },
    }),
    []
  )

  const { send: doSend } = useStream(streamCallbacks)

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, desktopSidebarOpen ? '1' : '0')
    } catch {}
  }, [desktopSidebarOpen])

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

  const loadHistory = useCallback(
    async (sessionId: string) => {
      if (historyMessages[sessionId]) return
      setIsLoadingHistory(true)
      try {
        const res = await getSessionHistory(sessionId)
        const msgs: UIMessage[] = res.history.map((h, i) => ({
          id: `${sessionId}-${i}`,
          role: h.role as 'user' | 'assistant' | 'tool',
          content: h.content,
          createdAt: Date.now()
        }))
        setHistoryMessages((prev) => ({ ...prev, [sessionId]: msgs }))
        setSessionMessages((prev) => ({ ...prev, [sessionId]: msgs }))
      } catch (e) {
        setSessionMessages((prev) => ({ ...prev, [sessionId]: [] }))
      } finally {
        setIsLoadingHistory(false)
      }
    },
    [historyMessages]
  )

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
    [loadHistory, historyMessages, sessionMessages]
  )

  const handleNewChat = useCallback(() => {
    setActiveId(null)
    setMobileSidebarOpen(false)
  }, [])

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeId) {
        const id = await create({})
        if (!id) return
        setActiveId(id)
        setSessionMessages((prev) => ({ ...prev, [id]: [] }))
        setMobileSidebarOpen(false)
        const userMsg: UIMessage = { id: uuid(), role: 'user', content, createdAt: Date.now() }
        setSessionMessages((prev) => ({
          ...prev,
          [id]: [userMsg],
        }))
        setSessionStreaming((prev) => ({ ...prev, [id]: true }))
        streamSessionRef.current = id
        await doSend(id, content)
        return
      }
      streamSessionRef.current = activeId
      const userMsg: UIMessage = { id: uuid(), role: 'user', content, createdAt: Date.now() }
      setSessionMessages((prev) => ({
        ...prev,
        [activeId]: [...(prev[activeId] ?? []), userMsg],
      }))
      setSessionStreaming((prev) => ({ ...prev, [activeId]: true }))
      await doSend(activeId, content)
    },
    [activeId, create, doSend],
  )

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

  const headerTitle = activeSession ? activeSession.sessionId.slice(0, 8) : 'codenano'

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

  if (loading) {
    return (
      <div className="boot-splash">
        <div className="boot-splash-inner">
          <div className="boot-spinner">
            <div className="boot-glow" />
            <div className="boot-ring" />
            <div className="boot-dot" />
          </div>
          <span className="boot-label">正在加载</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'relative z-20 hidden shrink-0 lg:block transition-all duration-300 ease-in-out',
          desktopSidebarOpen ? 'w-[279px]' : 'w-0'
        )}
      >
        <div className={cn(
          'absolute inset-y-0 left-0 h-full w-[279px] bg-sidebar border-r border-sidebar-border/70',
          'transition-transform duration-300 ease-in-out',
          desktopSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
          <SidebarInner {...sidebarProps} onCollapse={() => setDesktopSidebarOpen(false)} />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent showCloseButton={false} className="w-[279px] p-0 sm:max-w-[279px] lg:hidden">
          <SidebarInner {...sidebarProps} onCollapse={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 min-h-0 relative flex flex-col w-full">
          <ThreadShell
            session={activeSession}
            title={headerTitle}
            onToggleSidebar={() => {
              const isDesktop = window.matchMedia('(min-width: 1024px)').matches
              if (isDesktop) setDesktopSidebarOpen((v) => !v)
              else setMobileSidebarOpen((v) => !v)
            }}
            onGoHome={() => setActiveId(null)}
            messages={currentMessages}
            isStreaming={isCurrentlyStreaming}
            isLoadingHistory={isLoadingHistory}
            onSend={handleSend}
          />
        </div>

        {/* Footer */}
        <footer className="w-full shrink-0 pb-1 pt-0">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8 text-center">
             <p className="text-xs sm:text-sm text-muted-foreground/60 tracking-tight">
               Powered by Claude Code, ©2026 无线网络产品工程与IT装备部
             </p>
          </div>
        </footer>
      </main>

      {/* Delete confirm modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl border p-6 shadow-2xl max-w-sm mx-4 animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold mb-2">{i18n.deleteConversation}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {i18n.deleteConfirm.replace('{label}', pendingDelete.label)}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                {i18n.cancel}
              </Button>
              <Button variant="destructive" onClick={() => void handleConfirmDelete()}>
                {i18n.delete}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error dialog */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl border p-6 shadow-2xl max-w-sm mx-4 animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold mb-2 text-destructive">错误</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {error}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="default" onClick={() => clearError()}>
                确定
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
  sessions, activeId, loading, theme, onToggleTheme,
  onNewChat, onSelect, onRefresh, onRequestDelete, onCollapse,
}: SidebarInnerProps) {
  return (
    <aside className="flex h-full w-full flex-col text-sidebar-foreground">
      {/* 顶部按钮组 */}
      <div className="flex items-center justify-between px-3 py-3">
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground transition-colors"
          onClick={onCollapse}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground transition-colors"
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* 新建对话按钮 */}
      <div className="px-3 pb-3">
        <Button
          onClick={onNewChat}
          className="h-10 w-full justify-start gap-2.5 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/10 px-4 text-sm font-medium shadow-none hover:bg-sidebar-accent/30 hover:border-sidebar-border transition-all"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          {i18n.newChat}
        </Button>
      </div>

      <Separator className="bg-sidebar-border/30 mx-3 w-auto" />

      {/* "最近" 标题栏 */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <span className="text-sm font-semibold text-muted-foreground/80 tracking-wide">
          {i18n.recent}
        </span>
        <Button
          variant="ghost" size="icon"
          className="h-6 w-6 rounded-md text-muted-foreground/40 hover:bg-sidebar-accent hover:text-muted-foreground transition-colors"
          onClick={onRefresh}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 列表区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
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