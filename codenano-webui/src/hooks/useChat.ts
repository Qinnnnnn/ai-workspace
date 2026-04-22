import { useCallback, useState } from 'react'
import type { UIMessage } from '@/lib/types'

interface UseChatReturn {
  messages: UIMessage[]
  isStreaming: boolean
  error: string | null
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>
  addUserMessage: (content: string) => UIMessage
  appendText: (text: string) => void
  setStreaming: (v: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

export function useChat(initial: UIMessage[] = []): UseChatReturn {
  const [messages, setMessages] = useState<UIMessage[]>(initial)
  const [isStreaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addUserMessage = useCallback((content: string): UIMessage => {
    const msg: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: Date.now(),
    }
    setMessages((prev) => [...prev, msg])
    return msg
  }, [])

  const appendText = useCallback((text: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === 'assistant' && last.isStreaming) {
        return [...prev.slice(0, -1), { ...last, content: last.content + text }]
      }
      // Create new assistant streaming message
      const msg: UIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
        isStreaming: true,
        createdAt: Date.now(),
      }
      return [...prev, msg]
    })
  }, [])

  const reset = useCallback(() => {
    setMessages([])
    setStreaming(false)
    setError(null)
  }, [])

  return { messages, isStreaming, error, setMessages, addUserMessage, appendText, setStreaming, setError, reset }
}
