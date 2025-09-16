import { Brain } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <Brain className="h-6 w-6 text-blue-600" />
            <span className="hidden font-bold sm:inline-block">
              MedevAI & Kiro Showcase
            </span>
          </a>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              href="#medevai"
            >
              MedevAI
            </a>
            <a
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              href="#kiro"
            >
              Kiro
            </a>
            <a
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              href="#faq"
            >
              FAQ
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}