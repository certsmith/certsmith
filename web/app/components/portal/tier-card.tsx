import { cn } from "cn"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import type { TierInfo } from "~/lib/tiers"

interface TierCardProps {
  tier: TierInfo
  isActive: boolean
  onClick: () => void
}

export function TierCard({ tier, isActive, onClick }: TierCardProps) {
  const isRsa = tier.family === "rsa"

  return (
    <Card
      data-tier={tier.id}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        "hover:border-primary/40",
        isActive &&
          "border-primary/50 bg-primary/[0.02] shadow-md ring-2 shadow-primary/5 ring-primary/60"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      aria-pressed={isActive}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-heading text-base font-semibold tracking-tight">
            {tier.name}
          </CardTitle>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
              !isActive &&
                (isRsa
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-violet-600 dark:text-violet-400")
            )}
          >
            {isRsa ? "RSA" : "ECC"}
          </Badge>
        </div>
        <CardDescription className="text-xs">{tier.algo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <p className="text-sm font-medium text-foreground/90">{tier.purpose}</p>
        <p className="text-xs text-muted-foreground">{tier.validity}</p>
      </CardContent>
    </Card>
  )
}
