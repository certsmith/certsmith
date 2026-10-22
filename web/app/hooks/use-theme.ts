import * as React from "react"

export type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "certsmith-theme"

export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>("dark")

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === "light" || stored === "dark") {
        setThemeState(stored)
        applyTheme(stored)
      } else {
        // Default to dark mode for developer / security aesthetic
        setThemeState("dark")
        applyTheme("dark")
      }
    } catch {
      applyTheme("dark")
    }
  }, [])

  const applyTheme = (nextTheme: Theme) => {
    const root = document.documentElement
    if (nextTheme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {}
      applyTheme(next)
      return next
    })
  }, [])

  // Keyboard shortcut: press 'd' to toggle theme
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "d" || e.key === "D") {
        const target = e.target as HTMLElement | null
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return
        }
        if (e.metaKey || e.ctrlKey || e.altKey) {
          return
        }
        e.preventDefault()
        toggleTheme()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleTheme])

  return { theme, toggleTheme }
}
