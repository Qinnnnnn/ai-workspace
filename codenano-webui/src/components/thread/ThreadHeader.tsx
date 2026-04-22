import { ArrowLeft, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThreadHeaderProps {
  title: string
  onToggleSidebar: () => void
  onGoHome: () => void
  hideSidebarToggleOnDesktop?: boolean
}

export function ThreadHeader({ title, onToggleSidebar, onGoHome, hideSidebarToggleOnDesktop }: ThreadHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border/70 px-2">
      {!hideSidebarToggleOnDesktop && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent"
        onClick={onGoHome}
        aria-label="Back to home"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title || 'codenano'}</p>
      </div>
    </header>
  )
}
