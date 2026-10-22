import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "~/components/ui/code-block"
import { useHighlightedCode } from "~/hooks/use-highlighted-code"
import { CodeBlockLine } from "~/components/ui/code-block"
import type { TierInfo } from "~/lib/tiers"
import { buildAcmeUrl, buildCertbotCommand, buildCurlCommand } from "~/lib/tiers"

import * as React from "react"

interface QuickStartProps {
  activeTier: TierInfo | null
  origin?: string
}

function HighlightedBlock({
  code,
  language,
  title,
}: {
  code: string
  language: string
  title: string
}) {
  const highlighted = useHighlightedCode(code, language)

  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>{title}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>
        {highlighted.map((line, i) => (
          <CodeBlockLine key={i}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

export function QuickStart({ activeTier, origin }: QuickStartProps) {
  const [clientOrigin, setClientOrigin] = React.useState(origin || "")

  React.useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setClientOrigin(window.location.origin)
    }
  }, [origin])

  const baseUrl = origin || clientOrigin || (typeof window !== "undefined" ? window.location.origin : "")

  if (!activeTier) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Quick Start
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select a tier above to generate the command.
          </p>
        </div>
        <div className="grid gap-3">
          <CodeBlock>
            <CodeBlockHeader>
              <CodeBlockTitle>ACME Directory URL</CodeBlockTitle>
            </CodeBlockHeader>
            <CodeBlockContent>
              <CodeBlockLine>—</CodeBlockLine>
            </CodeBlockContent>
          </CodeBlock>
          <CodeBlock>
            <CodeBlockHeader>
              <CodeBlockTitle>Certbot Command</CodeBlockTitle>
            </CodeBlockHeader>
            <CodeBlockContent>
              <CodeBlockLine>—</CodeBlockLine>
            </CodeBlockContent>
          </CodeBlock>
          <CodeBlock>
            <CodeBlockHeader>
              <CodeBlockTitle>Test with cURL</CodeBlockTitle>
            </CodeBlockHeader>
            <CodeBlockContent>
              <CodeBlockLine>—</CodeBlockLine>
            </CodeBlockContent>
          </CodeBlock>
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
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Quick Start
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Commands for{" "}
          <span className="font-semibold text-foreground">
            {activeTier.name}
          </span>{" "}
          ({activeTier.algo})
        </p>
      </div>
      <div className="grid gap-3">
        <HighlightedBlock
          code={acmeUrl}
          language="bash"
          title="ACME Directory URL"
        />
        <HighlightedBlock
          code={certbotCmd}
          language="bash"
          title="Certbot Command"
        />
        <HighlightedBlock
          code={curlCmd}
          language="bash"
          title="Test with cURL"
        />
      </div>
    </section>
  )
}
