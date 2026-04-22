import { useCallback, useRef } from 'react'
import { parseSSEStream } from '@/api/sse'
import { sendMessage } from '@/api/sessions'
import type { StreamEvent } from '@/lib/types'

interface UseStreamCallbacks {
  onText: (text: string) => void
  onThinking: (text: string) => void
  onToolUse: (event: Extract<StreamEvent, { type: 'tool_use' }>) => void
  onToolResult: (event: Extract<StreamEvent, { type: 'tool_result' }>) => void
  onDone: (finalText: string) => void
  onError: (error: string) => void
}

export function useStream(callbacks: UseStreamCallbacks) {
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (sessionId: string, prompt: string) => {
      // Abort any ongoing stream
      if (abortRef.current) {
        abortRef.current.abort()
      }
      abortRef.current = new AbortController()

      let finalText = ''

      try {
        const response = await sendMessage(sessionId, prompt)

        if (!response.ok) {
          const err = await response.text()
          callbacks.onError(`HTTP ${response.status}: ${err}`)
          return
        }

        for await (const event of parseSSEStream(response)) {
          if (abortRef.current?.signal.aborted) break

          switch (event.type) {
            case 'text':
              finalText += event.text
              callbacks.onText(event.text)
              break

            case 'thinking':
              callbacks.onThinking(event.thinking)
              break

            case 'tool_use':
              callbacks.onToolUse(event)
              break

            case 'tool_result':
              callbacks.onToolResult(event)
              break

            case 'turn_end':
              break

            case 'error':
              callbacks.onError(event.error?.message ?? 'Unknown error')
              break

            case 'result':
              callbacks.onDone(finalText)
              break
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          callbacks.onError((e as Error).message)
        }
      }
    },
    [callbacks],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { send, abort }
}
