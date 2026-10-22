import { Separator } from "~/components/ui/separator"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="container mx-auto px-4 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          Certsmith — Private ACME CA Appliance
        </p>
        <Separator orientation="vertical" className="h-3 hidden sm:block" />
        <p>
          Powered by{" "}
          <a
            href="https://smallstep.com/certificates/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-2 font-medium"
          >
            step-ca
          </a>
        </p>
      </div>
    </footer>
  )
}
