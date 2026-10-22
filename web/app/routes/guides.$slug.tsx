import * as React from "react"
import { useParams, Link } from "react-router"
import { GuideViewer } from "~/components/guides/guide-viewer"
import { getGuideBySlug, getAllGuides } from "~/lib/guides-data"
import { useOrigin } from "~/hooks/use-origin"
import { Button } from "~/components/ui/button"
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Terminal,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"
import { Badge } from "~/components/ui/badge"

export function meta({ params }: { params: { slug?: string } }) {
  const guide = getGuideBySlug(params.slug || "")
  if (!guide) {
    return [{ title: "Guide Not Found — Certsmith" }]
  }
  return [
    { title: `${guide.title} — Certsmith Guides` },
    { name: "description", content: guide.description },
  ]
}

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const origin = useOrigin()
  const guide = getGuideBySlug(slug || "")
  const allGuides = getAllGuides()

  if (!guide) {
    return (
      <div className="space-y-6 rounded-xl border border-border/80 bg-card p-8 shadow-xs sm:p-12">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <Badge
              variant="destructive"
              className="font-mono text-[10px] uppercase"
            >
              Guide Not Found
            </Badge>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Document &quot;{slug}&quot; Does Not Exist
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              The documentation page you requested is not part of this Certsmith
              deployment. Please check the spelling or choose from the official
              guides below.
            </p>
          </div>
        </div>

        {/* Available Guides Cards */}
        <div className="pt-2">
          <div className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Available Documentation Guides:
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {allGuides.map((g) => (
              <Link
                key={g.slug}
                to={`/guides/${g.slug}`}
                className="group flex items-start gap-3 rounded-lg border border-border p-3.5 text-left transition-all hover:border-primary/40 hover:bg-accent/60"
              >
                <div className="shrink-0 rounded-md bg-muted p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  {g.icon === "shield-check" ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <Terminal className="size-4" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {g.title}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {g.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Back action */}
        <div className="flex justify-center border-t border-border pt-2 sm:justify-start">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/guides/root-ca">
              <ArrowLeft className="size-4" />
              <span>Back to Root CA Guide</span>
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-10">
      <GuideViewer content={guide.content} origin={origin} />
    </div>
  )
}

export function ErrorBoundary() {
  return (
    <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        Failed to Render Documentation Guide
      </h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        An error occurred while compiling or displaying this markdown guide.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="size-3.5" />
          <span>Reload Document</span>
        </Button>
        <Button asChild size="sm" className="gap-2">
          <Link to="/guides/root-ca">
            <BookOpen className="size-3.5" />
            <span>Go to Root CA Guide</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
