'use client';

import { cn } from "cn"
import type { TierInfo } from "@/lib/tiers"

interface TierCardProps {
  tier: TierInfo
  isActive: boolean
  onClick: () => void
}

export function TierCard({ tier, isActive, onClick }: TierCardProps) {
  const isRsa = tier.family === "rsa"

  return (
    <div
      data-tier={tier.id}
      className={cn(
        "cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
        "bg-card text-card-foreground hover:border-primary/40",
        isActive
          ? "border-primary/60 bg-primary/[0.04] shadow-md ring-2 ring-primary/60"
          : "border-border/80"
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
      <div className="flex items-center justify-between gap-2 pb-1">
        <h4 className="font-heading text-base font-semibold tracking-tight text-foreground">
          {tier.name}
        </h4>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
            isActive
              ? "bg-primary text-primary-foreground"
              : isRsa
              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
              : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
          )}
        >
          {isRsa ? "RSA" : "ECC"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{tier.algo}</p>
      <div className="mt-2 space-y-1">
        <p className="text-sm font-medium text-foreground/90">{tier.purpose}</p>
        <p className="text-xs text-muted-foreground">{tier.validity}</p>
      </div>
    </div>
  )
}
