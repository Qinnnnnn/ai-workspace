import { Sparkles } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50/30 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-[12px] animate-pulse" />
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200/50 border-t-blue-500/80 animate-[spin_1.5s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
          <Sparkles className="relative z-10 h-5 w-5 text-blue-500/80 animate-pulse" strokeWidth={2} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-700">
            Codenano
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium tracking-widest text-slate-400 animate-pulse">
              Initializing workspace
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
