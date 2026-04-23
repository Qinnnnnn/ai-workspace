import { Menu, ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThreadHeaderProps {
  title: string
  onToggleSidebar: () => void
  onGoHome: () => void
  hideSidebarToggleOnDesktop?: boolean
}

export function ThreadHeader({
  title,
  onToggleSidebar,
  onGoHome,
  hideSidebarToggleOnDesktop,
}: ThreadHeaderProps) {
  // 判断是否是"首页"状态
  const isHomePage = !title || title === 'codenano' || title === '新对话';

  return (
    <header className="sticky top-0 z-10 flex h-14 w-full items-center justify-between border-b border-border/30 bg-background/60 px-3 backdrop-blur-xl transition-all">
      <div className="flex items-center gap-1">

        {/* 侧边栏开关 */}
        {!hideSidebarToggleOnDesktop && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md text-muted-foreground/60 hover:bg-accent hover:text-foreground"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* 视觉分割线 */}
            <div className="mx-2 h-4 w-px bg-border/40 hidden sm:block" />
          </>
        )}

        {/* 导航路径 (Breadcrumbs) */}
        <nav className="flex items-center">
          <Button
            variant="ghost"
            className={cn(
              "h-9 gap-2 px-2.5 font-medium transition-colors text-sm",
              isHomePage ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground"
            )}
            onClick={onGoHome}
          >
            <Home className="h-4 w-4" />
            <span>首页</span>
          </Button>

          {/* 只有在非首页时，才显示箭头和标题 */}
          {!isHomePage && (
            <div className="flex items-center animate-in fade-in slide-in-from-left-1">
              <ChevronRight className="mx-0.5 h-4 w-4 text-muted-foreground/30" />
              <div className="px-2 py-1">
                <span className="text-sm font-medium text-foreground/90 tracking-tight truncate max-w-[150px] sm:max-w-[350px]">
                  {title}
                </span>
              </div>
            </div>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* 右侧预留 */}
      </div>
    </header>
  )
}
