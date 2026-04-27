import { request, API_BASE } from './client'
import type { SessionSummary, HistoryMessage } from '@/lib/types'

export interface CreateSessionBody {
  config?: {
    model?: string
    toolPreset?: 'core' | 'extended' | 'all'
    [key: string]: unknown
  }
  toolPermissions?: Record<string, 'allow' | 'deny'>
}

export interface CreateSessionResponse {
  sessionId: string
  cwd: string
}

export interface ListSessionsResponse {
  sessions: SessionSummary[]
}

export async function listSessions(): Promise<SessionSummary[]> {
  const body = await request<ListSessionsResponse>('/api/v1/sessions')
  return body.sessions
}

export async function createSession(body: CreateSessionBody = {}): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({
      config: body.config ?? { model: 'claude-sonnet-4-6' },
      toolPermissions: body.toolPermissions ?? {},
    }),
  })
}

export async function getSession(sessionId: string): Promise<SessionSummary> {
  return request<SessionSummary>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`)
}

export async function deleteSession(sessionId: string): Promise<void> {
  await request(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
}

export async function getSessionHistory(sessionId: string): Promise<{ history: HistoryMessage[] }> {
  return request<{ history: HistoryMessage[] }>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}/history`,
  )
}

export async function sendMessage(
  sessionId: string,
  prompt: string,
): Promise<Response> {
  return fetch(`${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, stream: true }),
    credentials: 'same-origin',
  })
}

export async function abortSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}/abort`, {
      method: 'POST',
      credentials: 'same-origin',
    })
  } catch {
    // fire-and-forget, ignore errors
  }
}
