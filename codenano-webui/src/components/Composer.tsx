import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ComposerProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
  variant?: 'thread' | 'hero'
}

export function Composer({
  onSend,
  disabled,
  placeholder = 'Type your message…',
  compact = false,
  variant = 'thread',
}: ComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isHero = variant === 'hero'

  useEffect(() => {
    if (disabled) return
    const el = textareaRef.current
    if (!el) return
    const id = requestAnimationFrame(() => el.focus())
    return () => cancelAnimationFrame(id)
  }, [disabled])

  const submit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        el.style.height = 'auto'
        el.focus()
      }
    })
  }, [disabled, onSend, value])

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const onInput: React.FormEventHandler<HTMLTextAreaElement> = (e) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn('w-full', compact ? 'px-0' : isHero ? 'px-0' : 'px-1 pb-1.5 pt-1 sm:px-0')}
    >
      <div
        className={cn(
          'relative mx-auto flex w-full flex-col overflow-hidden transition-all duration-200',
          isHero
            ? 'max-w-[40rem] rounded-3xl border border-black/10 dark:border-white/10 bg-card/80 shadow-[0_0_40px_rgba(0,0,0,0.08),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_0_40px_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.3)]'
            : 'max-w-[74rem] rounded-2xl border border-black/10 dark:border-white/10 bg-card/60 shadow-sm dark:shadow-none',
          'focus-within:bg-card/85 focus-within:shadow-md',
          disabled && 'opacity-60',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={onInput}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Message input"
          className={cn(
            'w-full resize-none bg-transparent',
            isHero
              ? 'min-h-[100px] px-5 pb-2.5 pt-4 text-[15px] leading-[1.6]'
              : 'min-h-[60px] px-4 pb-1.5 pt-3 text-[15px]',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus-visible:outline-none',
            'disabled:cursor-not-allowed',
          )}
        />
        <div
          className={cn('flex items-center justify-between gap-2', isHero ? 'px-3.5 pb-3.5' : 'px-3 pb-2')}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden select-none text-[10.5px] text-muted-foreground/60 sm:inline">
              Enter to send · Shift+Enter for newline
            </span>
          </div>
          <span className="sm:hidden" aria-hidden />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className={cn(
              'rounded-full border border-black/10 dark:border-white/15 bg-foreground text-background shadow-sm transition-all hover:bg-foreground/90 hover:shadow-md active:scale-95',
              isHero ? 'h-8.5 w-8.5' : 'h-7.5 w-7.5',
              value.trim() && !disabled && 'hover:scale-[1.04] active:scale-95',
            )}
          >
            <ArrowUp className={cn(isHero ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
          </Button>
        </div>
      </div>
    </form>
  )
}
