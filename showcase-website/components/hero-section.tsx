import { Button } from '@/components/ui/button'
import { Brain, Code } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="container space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          Revolutionizing Medical Device Development
        </h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          Discover how MedevAI transforms FDA regulatory processes and how Kiro enables the future of AI-powered development.
        </p>
        <div className="space-x-4">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Brain className="mr-2 h-4 w-4" />
            Explore MedevAI
          </Button>
          <Button variant="outline" size="lg">
            <Code className="mr-2 h-4 w-4" />
            Discover Kiro
          </Button>
        </div>
      </div>
    </section>
  )
}