'use client'

import * as React from 'react'
import { Copy, Check } from 'lucide-react'
import { useDynamicOrigin } from '@/hooks/use-origin'

export interface DynamicHostProps {
  fallback?: string
  className?: string
}

export interface DynamicOriginProps extends DynamicHostProps {
  path?: string
}

export interface AcmeUrlProps extends DynamicHostProps {
  tier?: string
}

export interface DynamicTextProps {
  template: string
  className?: string
}

export interface DynamicSnippetProps {
  title?: string
  template: string
  className?: string
}

/**
 * Renders the live origin (e.g., "https://pki.internal.lan:8443"), optionally with an appended path.
 */
export function DynamicOrigin({ path = '', fallback, className }: DynamicOriginProps) {
  const { origin } = useDynamicOrigin(fallback)
  const formattedPath = path.startsWith('/') ? path : path ? `/${path}` : ''
  return <span className={className}>{origin}{formattedPath}</span>
}

/**
 * Renders the live host (domain + port if non-standard, e.g., "pki.internal.lan:8443").
 */
export function DynamicHost({ fallback, className }: DynamicHostProps) {
  const { host } = useDynamicOrigin(fallback)
  return <span className={className}>{host}</span>
}

/**
 * Renders the live hostname (domain only, e.g., "pki.internal.lan").
 */
export function DynamicHostname({ fallback, className }: DynamicHostProps) {
  const { hostname } = useDynamicOrigin(fallback)
  return <span className={className}>{hostname}</span>
}

/**
 * Renders the dynamic ACME directory URL for a specific tier.
 */
export function AcmeUrl({ tier = 'ce2', fallback, className }: AcmeUrlProps) {
  const { origin } = useDynamicOrigin(fallback)
  return <span className={className}>{origin}/acme/{tier}/directory</span>
}

/**
 * Replaces {{ORIGIN}}, {{HOST}}, and {{HOSTNAME}} in a string dynamically.
 */
export function DynamicText({ template, className }: DynamicTextProps) {
  const { origin, host, hostname } = useDynamicOrigin()
  const resolved = template
    .replaceAll('{{ORIGIN}}', origin)
    .replaceAll('{{HOST}}', host)
    .replaceAll('{{HOSTNAME}}', hostname)

  return <span className={className}>{resolved}</span>
}

/**
 * Clean interactive code snippet that dynamically renders code
 * with live {{ORIGIN}}, {{HOST}}, and {{HOSTNAME}} interpolation,
 * including a 1-click copy button.
 */
export function DynamicSnippet({ title = 'Command', template, className }: DynamicSnippetProps) {
  const { origin, host, hostname } = useDynamicOrigin()
  const [copied, setCopied] = React.useState(false)

  const resolvedCode = React.useMemo(() => {
    return template
      .replaceAll('{{ORIGIN}}', origin)
      .replaceAll('{{HOST}}', host)
      .replaceAll('{{HOSTNAME}}', hostname)
      .replaceAll('https://<your-certsmith-host>', origin)
      .replaceAll('<your-certsmith-host>', host)
      .replaceAll('https://ca.internal.lan', origin)
      .replaceAll('ca.internal.lan', host)
  }, [template, origin, host, hostname])

  const copy = () => {
    if (!resolvedCode) return
    navigator.clipboard.writeText(resolvedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`my-4 rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs not-prose ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
          {title}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 font-mono text-xs sm:text-sm overflow-x-auto bg-muted/10">
        <pre className="text-foreground leading-relaxed whitespace-pre font-mono">
          <code>{resolvedCode}</code>
        </pre>
      </div>
    </div>
  )
}

/**
 * Specialized component that renders dynamic curl & wget Root CA download commands
 * using the live browser origin.
 */
export function RootCaDownloadSnippet() {
  const { origin } = useDynamicOrigin()
  const snippet = `# Download using curl (direct from appliance)
curl -fsSL -o root_ca.crt ${origin}/root_ca.crt

# Or using wget
wget -O root_ca.crt ${origin}/root_ca.crt`

  return (
    <DynamicSnippet
      title="Download Root CA Certificate"
      template={snippet}
    />
  )
}
