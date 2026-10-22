import * as React from "react"
import { useParams, Link } from "react-router"
import { GuideViewer } from "~/components/guides/guide-viewer"
import { getGuideBySlug, getAllGuides } from "~/lib/guides-data"
import { useOrigin } from "~/hooks/use-origin"
import { Button } from "~/components/ui/button"
import { AlertCircle, ArrowLeft, BookOpen, Terminal, ShieldCheck, RefreshCw } from "lucide-react"
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
      <div className="rounded-xl border border-border/80 bg-card p-8 sm:p-12 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="size-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
            <AlertCircle className="size-6" />
          </div>
          <div className="text-center sm:text-left space-y-1">
            <Badge variant="destructive" className="font-mono text-[10px] uppercase">
              Guide Not Found
            </Badge>
            <h2 className="text-xl font-heading font-bold text-foreground">
              Document &quot;{slug}&quot; Does Not Exist
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              The documentation page you requested is not part of this Certsmith deployment. Please check the spelling or choose from the official guides below.
            </p>
          </div>
        </div>

        {/* Available Guides Cards */}
        <div className="pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Available Documentation Guides:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allGuides.map((g) => (
              <Link
                key={g.slug}
                to={`/guides/${g.slug}`}
                className="group flex items-start gap-3 rounded-lg border border-border p-3.5 hover:bg-accent/60 hover:border-primary/40 transition-all text-left"
              >
                <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                  {g.icon === "shield-check" ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <Terminal className="size-4" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {g.title}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {g.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Back action */}
        <div className="pt-2 border-t border-border flex justify-center sm:justify-start">
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
    <div className="rounded-xl border border-border bg-card p-6 sm:p-10 shadow-xs">
      <GuideViewer content={guide.content} origin={origin} />
    </div>
  )
}

export function ErrorBoundary() {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
      <div className="size-12 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-foreground">
        Failed to Render Documentation Guide
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        An error occurred while compiling or displaying this markdown guide.
      </p>
      <div className="pt-2 flex justify-center gap-3">
        <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="gap-2">
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
