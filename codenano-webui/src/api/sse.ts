import type { StreamEvent } from '@/lib/types'

const SSE_DELIMITER = '\n\n'

export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<StreamEvent, void, unknown> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete events ( delimited by \n\n )
      let delimiterIndex: number
      while ((delimiterIndex = buffer.indexOf(SSE_DELIMITER)) !== -1) {
        const raw = buffer.slice(0, delimiterIndex)
        buffer = buffer.slice(delimiterIndex + SSE_DELIMITER.length)

        for (const line of raw.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as StreamEvent
              yield event
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    }

    // Process remaining buffer
    for (const line of buffer.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent
          yield event
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
