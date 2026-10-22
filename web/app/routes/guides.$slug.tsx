import * as React from "react"
import { useParams, Link } from "react-router"
import { GuideViewer } from "~/components/guides/guide-viewer"
import { getGuideBySlug } from "~/lib/guides-data"
import { useOrigin } from "~/hooks/use-origin"
import { Button } from "~/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"

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

  if (!guide) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center space-y-4">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Guide Not Found
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The requested guide &quot;{slug}&quot; does not exist. Please check the URL or return to the main guides page.
        </p>
        <div className="pt-2">
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
