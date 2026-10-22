import * as React from "react"
import { useSearchParams, Link } from "react-router"
import {
  ServerCrash,
  RefreshCw,
  Home,
  BookOpen,
  Download,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"

export function meta() {
  return [
    { title: "Service Interruption — Certsmith" },
    {
      name: "description",
      content: "Certsmith appliance server status and recovery.",
    },
  ]
}

interface ErrorDetails {
  badge: string
  title: string
  description: string
  troubleshooting: string
}

function getErrorDetails(status: string): ErrorDetails {
  switch (status) {
    case "502":
      return {
        badge: "502 Bad Gateway",
        title: "Intermediate CA Daemons Unreachable",
        description:
          "Nginx is online, but the background step-ca intermediate tier daemons (CR1-CR3 / CE1-CE3) are not answering on their internal ports.",
        troubleshooting:
          "The daemons may be starting up, generating new keys, or restarting. Check container logs using 'docker logs certsmith' if this persists.",
      }
    case "503":
      return {
        badge: "503 Service Unavailable",
        title: "Certsmith Appliance Is Starting",
        description:
          "The certificate authority service is temporarily unavailable or undergoing initialization.",
        troubleshooting:
          "Initialization usually completes within 5-10 seconds. Please wait a moment and try refreshing.",
      }
    case "504":
      return {
        badge: "504 Gateway Timeout",
        title: "CA Request Timed Out",
        description:
          "The upstream certificate authority process took too long to complete your request.",
        troubleshooting:
          "The host may be under heavy cryptographic load or waiting for entropy during key generation.",
      }
    case "500":
    default:
      return {
        badge: `${status || "500"} Server Error`,
        title: "Internal Appliance Error",
        description:
          "An unexpected error occurred while processing the request through the Certsmith appliance.",
        troubleshooting:
          "Verify the container state and ensure persistent volumes at /data are properly mounted with write permissions.",
      }
  }
}

export default function ServerErrorPage() {
  const [params] = useSearchParams()
  const rawStatus = params.get("status") || "502"
  const details = getErrorDetails(rawStatus)

  const [isChecking, setIsChecking] = React.useState(false)
  const [serviceRestored, setServiceRestored] = React.useState(false)

  const checkHealth = React.useCallback(async () => {
    setIsChecking(true)
    try {
      const res = await fetch("/healthz", { cache: "no-store" })
      if (res.ok) {
        setServiceRestored(true)
        setTimeout(() => {
          window.location.href = "/"
        }, 1200)
      }
    } catch {
      // Still down
    } finally {
      setIsChecking(false)
    }
  }, [])

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="space-y-8 rounded-2xl border border-destructive/20 bg-card/60 p-8 text-center shadow-lg backdrop-blur-xs sm:p-12 sm:text-left">
        {/* Header with status badge */}
        <div className="flex flex-col items-center justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
              <ServerCrash className="size-6" />
            </div>
            <div>
              <Badge
                variant="destructive"
                className="px-2 py-0.5 font-mono text-xs uppercase"
              >
                {details.badge}
              </Badge>
              <h1 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                {details.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={checkHealth}
              disabled={isChecking || serviceRestored}
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
            >
              <RefreshCw
                className={`size-3.5 ${isChecking ? "animate-spin" : ""}`}
              />
              <span>{isChecking ? "Pinging..." : "Check Service"}</span>
            </Button>
          </div>
        </div>

        {/* Status notification if restored */}
        {serviceRestored && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>Connection restored! Redirecting to Trust Portal...</span>
          </div>
        )}

        {/* Error Explanation */}
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p className="text-base font-medium text-foreground">
            {details.description}
          </p>
          <div className="space-y-1 rounded-lg border border-border/50 bg-muted/50 p-4 font-mono text-xs">
            <div className="flex items-center gap-1.5 font-sans text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <ShieldAlert className="size-3 text-amber-500" />
              <span>Diagnostic Hint</span>
            </div>
            <p className="pt-1 font-sans text-xs text-muted-foreground">
              {details.troubleshooting}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-2 sm:justify-start">
          <Button asChild variant="default" className="gap-2">
            <Link to="/">
              <Home className="size-4" />
              <span>Trust Portal Home</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2">
            <Link to="/guides/root-ca">
              <BookOpen className="size-4" />
              <span>Documentation Guides</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="gap-2">
            <a href="/root_ca.crt" download="root_ca.crt">
              <Download className="size-4" />
              <span>Root CA (.crt)</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
