import * as React from "react"
import { Link, useLocation } from "react-router"
import { Download, Sun, Moon, ShieldCheck, BookOpen } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Kbd } from "~/components/ui/kbd"
import { useTheme } from "~/hooks/use-theme"

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const isHome = location.pathname === "/"
  const isGuides = location.pathname.startsWith("/guides")

  return (
    <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center p-1.5 transition-colors group-hover:bg-primary/20">
            <img src="/logo.svg" alt="Certsmith" className="size-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-lg leading-tight tracking-tight text-foreground flex items-center gap-1.5">
              Certsmith
            </span>
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              Private ACME Certificate Authority
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/">
            <Button
              variant={isHome ? "secondary" : "ghost"}
              size="sm"
              className="gap-2 font-medium"
            >
              <ShieldCheck className="size-4" />
              <span>Trust Portal</span>
            </Button>
          </Link>
          <Link to="/guides">
            <Button
              variant={isGuides ? "secondary" : "ghost"}
              size="sm"
              className="gap-2 font-medium"
            >
              <BookOpen className="size-4" />
              <span>Guides</span>
            </Button>
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Download Root CA */}
          <Button
            asChild
            variant="default"
            size="sm"
            className="gap-2 shadow-xs hidden sm:inline-flex"
          >
            <a href="/root_ca.crt" download="root_ca.crt" id="download-root-ca">
              <Download className="size-4" />
              <span>Download Root CA</span>
            </a>
          </Button>

          {/* Theme Toggle with shortcut indicator */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-1.5 px-2.5"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (Press 'd')`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-sky-500" />
            )}
            <Kbd className="hidden md:inline-flex text-[10px] px-1 py-0">d</Kbd>
          </Button>
        </div>
      </div>
    </header>
  )
}
