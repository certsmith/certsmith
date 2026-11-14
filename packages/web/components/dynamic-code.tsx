'use client'

import * as React from 'react'
import { useDynamicOrigin } from '@/hooks/use-origin'

/**
 * Client-side enhancer that wraps MDX content to safely replace
 * hostname/origin placeholders in text nodes after hydration,
 * while leaving Fumadocs' native CodeBlock, syntax highlighting,
 * and styling completely intact.
 */
export function DynamicContentEnhancer({ children }: { children: React.ReactNode }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { origin, host, hostname, isLoaded } = useDynamicOrigin()

  React.useEffect(() => {
    if (!isLoaded || !containerRef.current) return

    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    )

    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      if (!node.nodeValue) continue

      let val = node.nodeValue
      let changed = false

      if (val.includes('{{ORIGIN}}')) {
        val = val.replaceAll('{{ORIGIN}}', origin)
        changed = true
      }
      if (val.includes('{{HOST}}')) {
        val = val.replaceAll('{{HOST}}', host)
        changed = true
      }
      if (val.includes('{{HOSTNAME}}')) {
        val = val.replaceAll('{{HOSTNAME}}', hostname)
        changed = true
      }
      if (val.includes('https://<your-certsmith-host>')) {
        val = val.replaceAll('https://<your-certsmith-host>', origin)
        changed = true
      }
      if (val.includes('<your-certsmith-host>')) {
        val = val.replaceAll('<your-certsmith-host>', host)
        changed = true
      }
      if (val.includes('your-certsmith-host')) {
        val = val.replaceAll('your-certsmith-host', host)
        changed = true
      }
      if (val.includes('https://ca.internal.lan')) {
        val = val.replaceAll('https://ca.internal.lan', origin)
        changed = true
      }
      if (val.includes('ca.internal.lan')) {
        val = val.replaceAll('ca.internal.lan', host)
        changed = true
      }

      if (changed) {
        node.nodeValue = val
      }
    }
  }, [origin, host, hostname, isLoaded])

  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  )
}
