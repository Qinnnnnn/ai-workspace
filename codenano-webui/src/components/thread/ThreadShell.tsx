import { useCallback, useEffect, useRef, useState } from 'react'
import { ThreadHeader } from './ThreadHeader'
import { MessageList } from '@/components/MessageList'
import { Composer } from '@/components/Composer'
import { preloadMarkdownText } from '@/components/MarkdownText'
import type { SessionSummary, UIMessage } from '@/lib/types'

interface ModelOption {
  id: string
  name: string
}

interface ThreadShellProps {
  session: SessionSummary | null
  title: string
  onToggleSidebar: () => void
  onGoHome: () => void
  onNewChat: () => Promise<string | null>
  messages: UIMessage[]
  isStreaming: boolean
  isLoadingHistory: boolean
  onSend: (content: string) => void
  modelLabel?: string | null
  models?: readonly ModelOption[]
  selectedModel?: string
  onModelChange?: (modelId: string) => void
}

export function ThreadShell({
  session,
  title,
  onToggleSidebar,
  onGoHome,
  onNewChat,
  messages,
  isStreaming,
  isLoadingHistory,
  onSend,
  modelLabel,
  models,
  selectedModel,
  onModelChange,
}: ThreadShellProps) {
  const [booting, setBooting] = useState(false)
  const pendingFirstRef = useRef<string | null>(null)
  const showHeroComposer = messages.length === 0 && !isLoadingHistory && !session

  const handleWelcomeSend = useCallback(
    async (content: string) => {
      if (booting) return
      setBooting(true)
      pendingFirstRef.current = content
      const newId = await onNewChat()
      if (!newId) {
        pendingFirstRef.current = null
        setBooting(false)
      }
    },
    [booting, onNewChat],
  )

  // Flush pending first message after session is created
  useEffect(() => {
    if (!session) return
    const pending = pendingFirstRef.current
    if (!pending) return
    pendingFirstRef.current = null
    onSend(pending)
    setBooting(false)
  }, [session, onSend])

  useEffect(() => {
    const warm = () => preloadMarkdownText()
    if (typeof globalThis.requestIdleCallback === 'function') {
      const id = globalThis.requestIdleCallback(warm, { timeout: 1500 })
      return () => globalThis.cancelIdleCallback?.(id)
    }
    const id = globalThis.setTimeout(warm, 250)
    return () => globalThis.clearTimeout(id)
  }, [])

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ThreadHeader
        title={title}
        onToggleSidebar={onToggleSidebar}
        onGoHome={onGoHome}
        models={models}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
      />
      {session ? (
        <>
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading conversation…
            </div>
          ) : (
            <>
              <MessageList messages={messages} isStreaming={isStreaming} />
              <Composer
                onSend={onSend}
                disabled={!session || isStreaming}
                placeholder={isStreaming ? 'Waiting for response…' : 'Type your message…'}
                modelLabel={modelLabel}
                variant={showHeroComposer ? 'hero' : 'thread'}
              />
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-6">
            <div className="flex flex-col items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <picture>
                <source srcSet="/brand/nanobot_logo.webp" type="image/webp" />
                <img
                  src="/brand/nanobot_icon.png"
                  alt="codenano"
                  className="h-12 w-auto select-none drop-shadow-sm"
                  draggable={false}
                />
              </picture>
              <h1 className="text-xl font-medium tracking-tight text-foreground/90">
                What's on your mind?
              </h1>
              <p className="max-w-md text-center text-sm text-muted-foreground">
                Your conversations are persisted on the server. Start typing to begin.
              </p>
            </div>
            <div className="w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <Composer
                compact
                disabled={booting}
                onSend={handleWelcomeSend}
                placeholder={booting ? 'Opening a new chat…' : 'Type your message…'}
                variant="hero"
              />
            </div>
          </div>
        </>
      )}
    </section>
  )
}
