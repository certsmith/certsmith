import * as React from "react"

export interface DynamicOriginState {
  origin: string
  host: string
  hostname: string
  protocol: string
  isLoaded: boolean
}

const DEFAULT_STATE: DynamicOriginState = {
  origin: "https://ca.internal.lan",
  host: "ca.internal.lan",
  hostname: "ca.internal.lan",
  protocol: "https:",
  isLoaded: false,
}

let cachedSnapshot: DynamicOriginState | null = null
let lastOrigin = ""

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }
  window.addEventListener("popstate", callback)
  return () => window.removeEventListener("popstate", callback)
}

function getSnapshot(): DynamicOriginState {
  if (typeof window === "undefined" || !window.location) {
    return DEFAULT_STATE
  }
  if (!cachedSnapshot || lastOrigin !== window.location.origin) {
    lastOrigin = window.location.origin
    cachedSnapshot = {
      origin: window.location.origin,
      host: window.location.host,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isLoaded: true,
    }
  }
  return cachedSnapshot
}

function getServerSnapshot(): DynamicOriginState {
  return DEFAULT_STATE
}

/**
 * Universal origin hook that safely resolves the origin URL
 * using useSyncExternalStore for hydration stability without cascading renders.
 */
export function useDynamicOrigin(fallbackOrigin?: string): DynamicOriginState {
  const snapshot = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  if (!snapshot.isLoaded && fallbackOrigin) {
    return {
      ...snapshot,
      origin: fallbackOrigin,
    }
  }

  return snapshot
}

/**
 * Backwards-compatible hook returning just the origin string.
 */
export function useOrigin(fallback?: string): string {
  const { origin } = useDynamicOrigin(fallback)
  return origin
}
