import * as React from "react"
import { Shield, Sparkles, BookOpen, Download } from "lucide-react"
import { Link } from "react-router"
import { useOrigin } from "~/hooks/use-origin"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Separator } from "~/components/ui/separator"
import { StatusBanner } from "~/components/portal/status-banner"
import { TierCard } from "~/components/portal/tier-card"
import { QuickStart } from "~/components/portal/quick-start"
import { RSA_TIERS, ECC_TIERS, type TierInfo } from "~/lib/tiers"

export function meta() {
  return [
    { title: "Certsmith — Private ACME Certificate Authority" },
    {
      name: "description",
      content:
        "Trust Portal and automated TLS certificate issuance powered by Certsmith and step-ca.",
    },
  ]
}

export default function HomePage() {
  const origin = useOrigin()
  const [selectedTier, setSelectedTier] = React.useState<TierInfo | null>(
    ECC_TIERS[1] // Default to CE2 (ECDSA P-256)
  )

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8 md:py-12 max-w-6xl space-y-10">
      {/* Real-time Health Status */}
      <StatusBanner />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>Internal PKI Infrastructure</span>
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            Certificate Authority Trust Portal
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Select a certificate tier to generate automated ACME issuance commands, or download the Root CA certificate to establish system-wide trust.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="default" size="default" className="gap-2">
            <a href="/root_ca.crt" download="root_ca.crt">
              <Download className="size-4" />
              <span>Download Root CA</span>
            </a>
          </Button>

          <Button asChild variant="outline" size="default" className="gap-2">
            <Link to="/guides">
              <BookOpen className="size-4" />
              <span>Setup Guides</span>
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* CA Tiers Grid */}
      <section className="space-y-8">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <span>Certificate Tiers</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose between ECDSA curves for modern, high-speed performance or RSA keys for broad legacy compatibility.
          </p>
        </div>

        {/* ECC Tiers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              ECC Family (Elliptic Curve Cryptography)
            </h3>
            <Badge variant="secondary" className="text-[10px] uppercase font-mono">
              Recommended
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {ECC_TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                isActive={selectedTier?.id === tier.id}
                onClick={() => setSelectedTier(tier)}
              />
            ))}
          </div>
        </div>

        {/* RSA Tiers */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            RSA Family (Rivest–Shamir–Adleman)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {RSA_TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                isActive={selectedTier?.id === tier.id}
                onClick={() => setSelectedTier(tier)}
              />
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Quick Start Code Block */}
      <QuickStart activeTier={selectedTier} origin={origin} />
    </div>
  )
}
