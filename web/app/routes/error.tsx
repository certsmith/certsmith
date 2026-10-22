import * as React from "react"
import { useSearchParams, Link } from "react-router"
import { ServerCrash, RefreshCw, Home, BookOpen, Download, ShieldAlert, CheckCircle2 } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"

export function meta() {
  return [
    { title: "Service Interruption — Certsmith" },
    { name: "description", content: "Certsmith appliance server status and recovery." },
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
    <div className="container mx-auto px-4 py-16 sm:py-24 max-w-3xl">
      <div className="rounded-2xl border border-destructive/20 bg-card/60 backdrop-blur-xs p-8 sm:p-12 shadow-lg space-y-8 text-center sm:text-left">
        {/* Header with status badge */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <ServerCrash className="size-6" />
            </div>
            <div>
              <Badge variant="destructive" className="font-mono text-xs uppercase px-2 py-0.5">
                {details.badge}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mt-1">
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
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`size-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Pinging..." : "Check Service"}</span>
            </Button>
          </div>
        </div>

        {/* Status notification if restored */}
        {serviceRestored && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-400 text-sm">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>Connection restored! Redirecting to Trust Portal...</span>
          </div>
        )}

        {/* Error Explanation */}
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p className="text-base text-foreground font-medium">{details.description}</p>
          <div className="rounded-lg bg-muted/50 p-4 border border-border/50 text-xs font-mono space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 font-sans font-semibold uppercase tracking-wider text-[10px]">
              <ShieldAlert className="size-3 text-amber-500" />
              <span>Diagnostic Hint</span>
            </div>
            <p className="font-sans text-xs text-muted-foreground pt-1">{details.troubleshooting}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 border-t border-border/60">
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
