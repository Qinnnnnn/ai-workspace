// Base URL for API - vite proxy forwards /api to codenano-api
export const API_BASE = ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...(init ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'same-origin',
  })
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

export { request }
