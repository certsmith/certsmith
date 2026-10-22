import { Separator } from "~/components/ui/separator"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row lg:px-8">
        <p>Certsmith — Private ACME CA Appliance</p>
        <Separator orientation="vertical" className="hidden h-3 sm:block" />
        <p>
          Powered by{" "}
          <a
            href="https://smallstep.com/certificates/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            step-ca
          </a>
        </p>
      </div>
    </footer>
  )
}
