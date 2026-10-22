import * as React from "react"
import { Outlet, NavLink, useLocation } from "react-router"
import { ShieldCheck, Terminal, BookOpen, ExternalLink } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { getAllGuides } from "~/lib/guides-data"

export function meta() {
  return [
    { title: "Certsmith Guides — Root CA & ACME Setup" },
    {
      name: "description",
      content:
        "Comprehensive installation instructions for the Certsmith Root CA across all operating systems and ACME client configurations.",
    },
  ]
}

export default function GuidesLayout() {
  const location = useLocation()
  const guides = getAllGuides()

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8 md:py-12 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col gap-3 pb-8 border-b border-border">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
            <BookOpen className="size-3.5 text-primary" />
            <span>Documentation & Guides</span>
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-foreground">
          Certsmith Guides
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          Step-by-step documentation to establish trust with your private Root CA across all platforms and automate certificate issuance with modern ACME clients.
        </p>
      </div>

      {/* Docs Navigation Bar (Fumadocs-style tabs / route links) */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <nav
          aria-label="Guides Navigation"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto"
        >
          {guides.map((guide) => {
            const targetPath = `/guides/${guide.slug}`
            const isActive =
              location.pathname === targetPath ||
              (location.pathname === "/guides" && guide.slug === "root-ca")

            return (
              <NavLink
                key={guide.slug}
                to={targetPath}
                className={cn(
                  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-background text-foreground shadow-xs"
                    : "hover:bg-background/50 hover:text-foreground"
                )}
              >
                {guide.icon === "shield-check" ? (
                  <ShieldCheck className="size-4" />
                ) : (
                  <Terminal className="size-4" />
                )}
                <span>{guide.title}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Quick link button to download Root CA */}
        <Button asChild variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
          <a href="/root_ca.crt" download="root_ca.crt">
            <ExternalLink className="size-3.5" />
            <span>Download Root CA (.crt)</span>
          </a>
        </Button>
      </div>

      {/* Route Outlet for Guide Content */}
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  )
}
