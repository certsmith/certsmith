import * as React from "react"
import { Link, isRouteErrorResponse } from "react-router"
import {
  FileQuestion,
  AlertTriangle,
  Home,
  BookOpen,
  Download,
  RefreshCw,
  ChevronDown,
  Terminal,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"

interface ErrorViewProps {
  error: unknown
}

export function ErrorView({ error }: ErrorViewProps) {
  const [showStack, setShowStack] = React.useState(false)

  const is404 = isRouteErrorResponse(error) && error.status === 404
  const statusText = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText || ""}`.trim()
    : "Application Error"

  const errorMessage = isRouteErrorResponse(error)
    ? error.data?.message ||
      "The requested resource could not be found or processed."
    : error instanceof Error
      ? error.message
      : "An unexpected client-side exception occurred."

  const stack = error instanceof Error ? error.stack : undefined

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="space-y-8 rounded-2xl border border-border/80 bg-card/60 p-8 text-center shadow-lg backdrop-blur-xs sm:p-12 sm:text-left">
        {/* Header with Icon and Badge */}
        <div className="flex flex-col items-center justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-12 items-center justify-center rounded-xl ${
                is404
                  ? "border border-primary/20 bg-primary/10 text-primary"
                  : "border border-destructive/20 bg-destructive/10 text-destructive"
              }`}
            >
              {is404 ? (
                <FileQuestion className="size-6" />
              ) : (
                <AlertTriangle className="size-6" />
              )}
            </div>
            <div>
              <Badge
                variant={is404 ? "outline" : "destructive"}
                className="px-2 py-0.5 font-mono text-xs uppercase"
              >
                {statusText}
              </Badge>
              <h1 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                {is404 ? "Page Not Found" : "Something Went Wrong"}
              </h1>
            </div>
          </div>

          {!is404 && (
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
            >
              <RefreshCw className="size-3.5" />
              <span>Reload Page</span>
            </Button>
          )}
        </div>

        {/* Message description */}
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p className="text-base font-medium text-foreground">
            {is404
              ? "The URL you requested does not match any route in the Trust Portal. It may have moved or been typed incorrectly."
              : errorMessage}
          </p>

          {is404 && (
            <p className="text-sm text-muted-foreground">
              Here are recommended pages to help you get back on track:
            </p>
          )}
        </div>

        {/* Quick Links Grid for 404 */}
        {is404 && (
          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Home className="size-4 shrink-0 text-primary" />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Trust Portal Home
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Select tiers & issue certificates
                </div>
              </div>
            </Link>

            <Link
              to="/guides/root-ca"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <BookOpen className="size-4 shrink-0 text-primary" />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Root CA Installation
                </div>
                <div className="text-[11px] text-muted-foreground">
                  OS & browser trust setup guides
                </div>
              </div>
            </Link>

            <Link
              to="/guides/acme-clients"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Terminal className="size-4 shrink-0 text-primary" />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  ACME Clients
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Certbot, Lego, Caddy configs
                </div>
              </div>
            </Link>

            <a
              href="/root_ca.crt"
              download="root_ca.crt"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="size-4 shrink-0 text-primary" />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Download Root CA
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Get the public .crt certificate
                </div>
              </div>
            </a>
          </div>
        )}

        {/* Optional Stack Trace disclosure (for non-404 in dev) */}
        {!is404 && stack && (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <button
              onClick={() => setShowStack(!showStack)}
              className="flex w-full items-center justify-between p-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <span>Error Stack Trace</span>
              <ChevronDown
                className={`size-4 transition-transform ${showStack ? "rotate-180" : ""}`}
              />
            </button>
            {showStack && (
              <pre className="max-h-64 overflow-x-auto border-t border-border/60 bg-muted/70 p-4 text-left font-mono text-[11px] leading-relaxed">
                <code>{stack}</code>
              </pre>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-2 sm:justify-start">
          <Button asChild variant="default" className="gap-2">
            <Link to="/">
              <Home className="size-4" />
              <span>Back to Portal Home</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2">
            <Link to="/guides/root-ca">
              <BookOpen className="size-4" />
              <span>Documentation Guides</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
