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
    ? error.data?.message || "The requested resource could not be found or processed."
    : error instanceof Error
    ? error.message
    : "An unexpected client-side exception occurred."

  const stack = error instanceof Error ? error.stack : undefined

  return (
    <div className="container mx-auto px-4 py-16 sm:py-24 max-w-3xl">
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-8 sm:p-12 shadow-lg space-y-8 text-center sm:text-left">
        {/* Header with Icon and Badge */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-3">
            <div
              className={`size-12 rounded-xl flex items-center justify-center ${
                is404
                  ? "bg-primary/10 border border-primary/20 text-primary"
                  : "bg-destructive/10 border border-destructive/20 text-destructive"
              }`}
            >
              {is404 ? <FileQuestion className="size-6" /> : <AlertTriangle className="size-6" />}
            </div>
            <div>
              <Badge
                variant={is404 ? "outline" : "destructive"}
                className="font-mono text-xs uppercase px-2 py-0.5"
              >
                {statusText}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mt-1">
                {is404 ? "Page Not Found" : "Something Went Wrong"}
              </h1>
            </div>
          </div>

          {!is404 && (
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
            >
              <RefreshCw className="size-3.5" />
              <span>Reload Page</span>
            </Button>
          )}
        </div>

        {/* Message description */}
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p className="text-base text-foreground font-medium">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <Home className="size-4 text-primary shrink-0" />
              <div>
                <div className="font-semibold text-xs text-foreground">Trust Portal Home</div>
                <div className="text-[11px] text-muted-foreground">Select tiers & issue certificates</div>
              </div>
            </Link>

            <Link
              to="/guides/root-ca"
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <BookOpen className="size-4 text-primary shrink-0" />
              <div>
                <div className="font-semibold text-xs text-foreground">Root CA Installation</div>
                <div className="text-[11px] text-muted-foreground">OS & browser trust setup guides</div>
              </div>
            </Link>

            <Link
              to="/guides/acme-clients"
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <Terminal className="size-4 text-primary shrink-0" />
              <div>
                <div className="font-semibold text-xs text-foreground">ACME Clients</div>
                <div className="text-[11px] text-muted-foreground">Certbot, Lego, Caddy configs</div>
              </div>
            </Link>

            <a
              href="/root_ca.crt"
              download="root_ca.crt"
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <Download className="size-4 text-primary shrink-0" />
              <div>
                <div className="font-semibold text-xs text-foreground">Download Root CA</div>
                <div className="text-[11px] text-muted-foreground">Get the public .crt certificate</div>
              </div>
            </a>
          </div>
        )}

        {/* Optional Stack Trace disclosure (for non-404 in dev) */}
        {!is404 && stack && (
          <div className="border border-border/60 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowStack(!showStack)}
              className="w-full flex items-center justify-between p-3 text-xs font-mono text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span>Error Stack Trace</span>
              <ChevronDown
                className={`size-4 transition-transform ${showStack ? "rotate-180" : ""}`}
              />
            </button>
            {showStack && (
              <pre className="p-4 bg-muted/70 text-left overflow-x-auto text-[11px] font-mono border-t border-border/60 leading-relaxed max-h-64">
                <code>{stack}</code>
              </pre>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 border-t border-border/60">
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
