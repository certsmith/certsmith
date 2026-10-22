import * as React from "react"
import { useNavigate } from "react-router"
import { GuideViewer } from "~/components/guides/guide-viewer"
import { getGuideBySlug } from "~/lib/guides-data"
import { useOrigin } from "~/hooks/use-origin"

/**
 * Default guides index page.
 * Renders the primary Root CA guide on initial static render
 * and updates the active client URL to /guides/root-ca.
 */
export default function GuidesIndexPage() {
  const navigate = useNavigate()
  const origin = useOrigin()
  const defaultGuide = getGuideBySlug("root-ca")

  React.useEffect(() => {
    navigate("/guides/root-ca", { replace: true })
  }, [navigate])

  if (!defaultGuide) return null

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-10">
      <GuideViewer content={defaultGuide.content} origin={origin} />
    </div>
  )
}
