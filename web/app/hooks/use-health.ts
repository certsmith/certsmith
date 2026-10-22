import * as React from "react"

export function useHealth() {
  const [status, setStatus] = React.useState<
    "loading" | "operational" | "degraded" | "offline"
  >("loading")
  const [message, setMessage] = React.useState("Checking service status…")

  React.useEffect(() => {
    const controller = new AbortController()

    fetch(`${window.location.origin}/healthz`, { signal: controller.signal })
      .then((res) => {
        if (res.ok) {
          setStatus("operational")
          setMessage("All 6 certificate tiers operational")
        } else {
          setStatus("degraded")
          setMessage("Service degraded — check container logs")
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setStatus("offline")
          setMessage("Cannot reach backend — is the container running?")
        }
      })

    return () => controller.abort()
  }, [])

  return { status, message }
}
