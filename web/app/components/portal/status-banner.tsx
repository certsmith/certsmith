import { cn } from "cn"
import { Activity, AlertTriangle, WifiOff, Loader2 } from "lucide-react"
import { useHealth } from "~/hooks/use-health"

const statusConfig = {
  loading: {
    icon: Loader2,
    iconClass: "text-muted-foreground animate-spin",
    bgClass: "bg-muted/50 border-muted",
    dotClass: "bg-muted-foreground",
  },
  operational: {
    icon: Activity,
    iconClass: "text-emerald-500",
    bgClass:
      "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/25",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  degraded: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    bgClass:
      "bg-amber-500/5 border-amber-500/20 dark:bg-amber-500/10 dark:border-amber-500/25",
    dotClass: "bg-amber-500 animate-pulse",
  },
  offline: {
    icon: WifiOff,
    iconClass: "text-red-500",
    bgClass:
      "bg-red-500/5 border-red-500/20 dark:bg-red-500/10 dark:border-red-500/25",
    dotClass: "bg-red-500",
  },
} as const

export function StatusBanner() {
  const { status, message } = useHealth()
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
        config.bgClass
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn("relative flex size-2.5 shrink-0")}>
        <span
          className={cn(
            "absolute inline-flex size-full rounded-full opacity-75",
            config.dotClass
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2.5 rounded-full",
            config.dotClass
          )}
        />
      </span>
      <Icon className={cn("size-4 shrink-0", config.iconClass)} />
      <span className="text-foreground">{message}</span>
    </div>
  )
}
