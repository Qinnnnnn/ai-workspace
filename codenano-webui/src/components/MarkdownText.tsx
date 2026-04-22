import { Suspense, lazy } from 'react'
import { cn } from '@/lib/utils'

const LazyMarkdownRenderer = lazy(() => import('./MarkdownTextRenderer').then(m => ({ default: m.MarkdownTextRenderer })))

interface MarkdownTextProps {
  children: string
  className?: string
}

export function preloadMarkdownText(): void {
  void import('./MarkdownTextRenderer')
}

export function MarkdownText({ children, className }: MarkdownTextProps) {
  return (
    <Suspense
      fallback={
        <div className={cn('whitespace-pre-wrap break-words leading-relaxed text-foreground/92', className)}>
          {children}
        </div>
      }
    >
      <LazyMarkdownRenderer className={className}>{children}</LazyMarkdownRenderer>
    </Suspense>
  )
}
