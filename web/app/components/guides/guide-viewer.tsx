import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MarkdownCode } from "~/components/guides/markdown-code"
import { buildTierVariables, interpolateVariables } from "~/lib/interpolate"
import "~/markdown.css"

interface GuideViewerProps {
  content: string
  origin?: string
}

export function GuideViewer({ content, origin }: GuideViewerProps) {
  const [clientOrigin, setClientOrigin] = React.useState<string>(origin || "")

  React.useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setClientOrigin(window.location.origin)
    }
  }, [origin])

  const effectiveOrigin = origin || clientOrigin || "http://localhost:5173"

  const interpolatedContent = React.useMemo(() => {
    const variables = buildTierVariables(effectiveOrigin)
    return interpolateVariables(content, variables)
  }, [content, effectiveOrigin])

  return (
    <div className="typeset typeset-notes max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const code = String(children).replace(/\n$/, "")

            if (match) {
              return (
                <MarkdownCode
                  code={code}
                  language={match[1]}
                  title={match[1]}
                />
              )
            }

            // Inline code
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {interpolatedContent}
      </ReactMarkdown>
    </div>
  )
}
