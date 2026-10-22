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
    <div className="container mx-auto max-w-6xl space-y-10 px-4 py-8 md:py-12 lg:px-8">
      {/* Real-time Health Status */}
      <StatusBanner />

      {/* Hero Header */}
      <div className="flex flex-col justify-between gap-6 pb-2 md:flex-row md:items-end">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
              <Sparkles className="size-3.5 text-primary" />
              <span>Internal PKI Infrastructure</span>
            </Badge>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Certificate Authority Trust Portal
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Select a certificate tier to generate automated ACME issuance
            commands, or download the Root CA certificate to establish
            system-wide trust.
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
          <h2 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            <Shield className="size-5 text-primary" />
            <span>Certificate Tiers</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose between ECDSA curves for modern, high-speed performance or
            RSA keys for broad legacy compatibility.
          </p>
        </div>

        {/* ECC Tiers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              ECC Family (Elliptic Curve Cryptography)
            </h3>
            <Badge
              variant="secondary"
              className="font-mono text-[10px] uppercase"
            >
              Recommended
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
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
          <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            RSA Family (Rivest–Shamir–Adleman)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
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
