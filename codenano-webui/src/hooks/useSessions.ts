import { useCallback, useEffect, useState } from 'react'
import { listSessions, createSession, deleteSession } from '@/api/sessions'
import type { SessionSummary } from '@/lib/types'

interface UseSessionsReturn {
  sessions: SessionSummary[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (config?: { model?: string; toolPreset?: string }) => Promise<string | null>
  remove: (sessionId: string) => Promise<void>
  clearError: () => void
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await listSessions()
      setSessions(data)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const create = useCallback(
    async (config?: { model?: string; toolPreset?: string }): Promise<string | null> => {
      try {
        const res = await createSession({
          config: config
            ? { model: config.model, toolPreset: config.toolPreset as 'core' | 'extended' | 'all' | undefined }
            : { model: 'claude-sonnet-4-6' },
        })
        await refresh()
        return res.sessionId
      } catch (e) {
        setError((e as Error).message)
        return null
      }
    },
    [refresh],
  )

  const remove = useCallback(
    async (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      try {
        await deleteSession(sessionId)
      } catch (e) {
        setError((e as Error).message)
        await refresh()
      }
    },
    [refresh],
  )

  return { sessions, loading, error, refresh, create, remove, clearError: () => setError(null) }
}
