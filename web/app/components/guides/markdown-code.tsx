import * as React from "react"
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
} from "~/components/ui/code-block"
import { useHighlightedCode } from "~/hooks/use-highlighted-code"

interface MarkdownCodeProps {
  code: string
  language: string
  title?: string
}

export function MarkdownCode({ code, language, title }: MarkdownCodeProps) {
  const trimmed = code.replace(/\n$/, "")
  const highlighted = useHighlightedCode(trimmed, language)

  return (
    <div data-not-typeset className="my-4">
      <CodeBlock>
        {title && (
          <CodeBlockHeader>
            <CodeBlockTitle>{title}</CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton value={trimmed} />
            </CodeBlockActions>
          </CodeBlockHeader>
        )}
        {!title && (
          <CodeBlockActions>
            <CodeBlockCopyButton value={trimmed} />
          </CodeBlockActions>
        )}
        <CodeBlockContent>
          {highlighted.map((line, i) => (
            <CodeBlockLine key={i}>{line}</CodeBlockLine>
          ))}
        </CodeBlockContent>
      </CodeBlock>
    </div>
  )
}
