import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { CodeBlock } from './CodeBlock'
import { cn } from '@/lib/utils'

interface MarkdownTextRendererProps {
  children: string
  className?: string
}

export function MarkdownTextRenderer({ children, className }: MarkdownTextRendererProps) {
  return (
    <ReactMarkdown
      className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children: codeChildren, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const isInline = !match
          if (isInline) {
            return (
              <code className={cn('rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.875em]', className)} {...props}>
                {codeChildren}
              </code>
            )
          }
          return (
            <CodeBlock language={match[1]} code={String(codeChildren).replace(/\n$/, '')} />
          )
        },
        pre({ children }) {
          return <>{children}</>
        },
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
