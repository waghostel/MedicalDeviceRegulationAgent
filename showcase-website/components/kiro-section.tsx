import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Code, CheckCircle, AlertTriangle } from 'lucide-react'

export function KiroSection() {
  return (
    <section id="kiro" className="container space-y-6 py-8 md:py-12 lg:py-24 bg-slate-50">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          Kiro: The Future of AI-Powered Development
        </h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          Discover how Kiro's spec-driven approach revolutionized the development of MedevAI.
        </p>
      </div>

      <div className="mx-auto max-w-[64rem]">
        <h3 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
          <Code className="h-6 w-6 text-blue-500" />
          Why Spec-Driven Development is the Future of AI Coding
        </h3>
        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Traditional Development Challenges:</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  Inconsistent code quality across team members
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  Time-consuming manual implementation of repetitive patterns
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  Difficulty maintaining architectural consistency
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Spec-Driven Advantages:</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Consistent, high-quality code generation from specifications
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Autonomous implementation of complex features
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Self-reinforcing development ecosystem
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}