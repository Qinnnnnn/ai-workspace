import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { i18n } from '@/lib/i18n'

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
          'relative mx-auto flex w-full flex-col overflow-hidden rounded-2xl transition-all duration-300 ease-out',
          isHero
            ? 'max-w-[40rem] border border-slate-200/70 bg-white/90 dark:border-white/10 dark:bg-card/80 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.4)]'
            : 'max-w-[74rem] border border-slate-200/60 bg-white/70 dark:border-white/10 dark:bg-card/60 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.05)] dark:shadow-none',
          'focus-within:border-slate-300/80 dark:focus-within:border-white/20',
          isHero
            ? 'focus-within:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] dark:focus-within:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]'
            : 'focus-within:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)] dark:focus-within:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)]',
          disabled && 'opacity-50',
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
              ? 'min-h-[100px] px-5 pb-2.5 pt-4 text-[15px] leading-[1.6] text-slate-700 dark:text-slate-200'
              : 'min-h-[60px] px-4 pb-1.5 pt-3 text-[15px] text-slate-700 dark:text-slate-200',
            'placeholder:text-slate-400/80',
            'focus:outline-none focus-visible:outline-none',
            'disabled:cursor-not-allowed',
          )}
        />
        <div
          className={cn('flex items-center justify-between gap-2', isHero ? 'px-3.5 pb-3.5' : 'px-3 pb-2')}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden select-none text-[11px] text-slate-400/70 font-medium tracking-wide sm:inline">
              {i18n.enterToSend}
            </span>
          </div>
          <span className="sm:hidden" aria-hidden />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className={cn(
              'rounded-full border border-black/10 dark:border-white/15 shadow-sm transition-all duration-200 ease-out',
              isHero ? 'h-10 w-10' : 'h-9 w-9',
              value.trim() && !disabled
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 hover:scale-[1.04] active:scale-95 shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed',
            )}
          >
            <ArrowUp className={cn(isHero ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
          </Button>
        </div>
      </div>
    </form>
  )
}
