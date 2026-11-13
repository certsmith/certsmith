'use client';

import * as React from "react"
import { Copy, Check } from "lucide-react"
import type { TierInfo } from "@/lib/tiers"
import {
  buildAcmeUrl,
  buildCertbotCommand,
  buildCurlCommand,
} from "@/lib/tiers"

interface QuickStartProps {
  activeTier: TierInfo | null
  origin?: string
}

function CodeSnippet({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = React.useState(false)

  const copy = () => {
    if (!code || code === "—") return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <button
          onClick={copy}
          disabled={!code || code === "—"}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 font-mono text-xs sm:text-sm overflow-x-auto">
        <pre className="text-foreground">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}

export function QuickStart({ activeTier, origin }: QuickStartProps) {
  const [clientOrigin, setClientOrigin] = React.useState(origin || "")

  React.useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setClientOrigin(window.location.origin)
    }
  }, [origin])

  const baseUrl =
    origin ||
    clientOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")

  if (!activeTier) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Quick Start
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a tier above to generate the command.
          </p>
        </div>
        <div className="grid gap-3">
          <CodeSnippet title="ACME Directory URL" code="—" />
          <CodeSnippet title="Certbot Command" code="—" />
          <CodeSnippet title="Test with cURL" code="—" />
        </div>
      </section>
    )
  }

  const acmeUrl = buildAcmeUrl(baseUrl, activeTier.id)
  const certbotCmd = buildCertbotCommand(activeTier, acmeUrl)
  const curlCmd = buildCurlCommand(acmeUrl)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Quick Start
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Automated issuance commands for{" "}
          <span className="font-semibold text-foreground">
            {activeTier.name}
          </span>{" "}
          ({activeTier.algo})
        </p>
      </div>
      <div className="grid gap-3">
        <CodeSnippet title="ACME Directory URL" code={acmeUrl} />
        <CodeSnippet title="Certbot Command" code={certbotCmd} />
        <CodeSnippet title="Test with cURL" code={curlCmd} />
      </div>
    </section>
  )
}
