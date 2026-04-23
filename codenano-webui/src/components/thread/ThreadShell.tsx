import { useCallback, useEffect, useRef, useState } from 'react'
import { ThreadHeader } from './ThreadHeader'
import { MessageList } from '@/components/MessageList'
import { Composer } from '@/components/Composer'
import { preloadMarkdownText } from '@/components/MarkdownText'
import type { SessionSummary, UIMessage } from '@/lib/types'
import { i18n } from '@/lib/i18n'

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
}: ThreadShellProps) {
  const [booting, setBooting] = useState(false)
  const pendingFirstRef = useRef<string | null>(null)

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
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ThreadHeader
        title={title}
        onToggleSidebar={onToggleSidebar}
        onGoHome={onGoHome}
      />
      <div className="flex flex-1 flex-col min-h-0 w-full">
        {session ? (
          <>
            {isLoadingHistory ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {i18n.loadingConversation}
              </div>
            ) : (
              <>
                <MessageList messages={messages} isStreaming={isStreaming} />
                <div className="w-full max-w-4xl mx-auto px-4 pb-6">
                  <div className="[&_textarea]:min-h-[90px] [&_textarea]:py-4 transition-all">
                    <Composer
                      onSend={onSend}
                      disabled={!session || isStreaming}
                      placeholder={isStreaming ? i18n.waitingForResponse : i18n.typeYourMessage}
                      variant="thread"
                    />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
              <div className="flex flex-col items-center max-w-[640px] w-full animate-in fade-in zoom-in-95 duration-1000">

                {/* Logo 保持精致尺寸 */}
                <div className="mb-8">
                  <picture className="block pointer-events-none select-none">
                    <source srcSet="/brand/codenano_logo.webp" type="image/webp" />
                    <img
                      src="/brand/codenano_icon.png"
                      alt="codenano"
                      className="h-28 w-auto object-contain"
                      draggable={false}
                    />
                  </picture>
                </div>

                {/* 文案排版：字号适中，增加呼吸感 */}
                <div className="text-center space-y-2 mb-10">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {i18n.whatsOnYourMind}
                  </h1>
                  <p className="text-sm text-muted-foreground/60">
                    {i18n.conversationsPersisted}
                  </p>
                </div>

                {/* 对话框：移除外部多余容器的 border 和 shadow，解决重影 */}
                <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 [&_textarea]:min-h-[90px]">
                  <Composer
                    compact
                    disabled={booting}
                    onSend={handleWelcomeSend}
                    placeholder={booting ? i18n.openingNewChat : "在此输入你的想法..."}
                    variant="hero"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}