import * as React from "react"

/**
 * Universal origin hook that safely resolves the origin URL
 * in both SSR and Client/SSG modes without requiring server loaders.
 */
export function useOrigin(fallback: string = "http://localhost:3000"): string {
  const [origin, setOrigin] = React.useState<string>(fallback)

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin)
    }
  }, [])

  return origin
}
