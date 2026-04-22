import { ArrowLeft, Menu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ModelOption {
  id: string
  name: string
}

interface ThreadHeaderProps {
  title: string
  onToggleSidebar: () => void
  onGoHome: () => void
  hideSidebarToggleOnDesktop?: boolean
  models?: readonly ModelOption[]
  selectedModel?: string
  onModelChange?: (modelId: string) => void
}

export function ThreadHeader({
  title,
  onToggleSidebar,
  onGoHome,
  hideSidebarToggleOnDesktop,
  models = [],
  selectedModel,
  onModelChange,
}: ThreadHeaderProps) {
  const currentModel = models.find((m) => m.id === selectedModel)

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
      {models.length > 0 && onModelChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-8 gap-1 rounded-lg px-2 text-muted-foreground hover:bg-accent',
                'text-xs font-medium'
              )}
            >
              <span className="hidden sm:inline">{currentModel?.name ?? selectedModel ?? 'Model'}</span>
              <span className="sm:hidden">Model</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onSelect={() => onModelChange(model.id)}
                className={cn(
                  'text-xs',
                  selectedModel === model.id && 'bg-accent'
                )}
              >
                {model.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
