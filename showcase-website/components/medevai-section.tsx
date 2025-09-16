import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Brain, 
  Search, 
  BarChart3, 
  FileText, 
  CheckCircle, 
  Shield
} from 'lucide-react'

export function MedevAISection() {
  return (
    <section id="medevai" className="container space-y-6 py-8 md:py-12 lg:py-24">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          MedevAI Features
        </h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          An intelligent regulatory assistant that transforms the complex FDA medical device approval process into a streamlined, AI-powered workflow.
        </p>
      </div>

      <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              Auto-Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Automatically determines FDA device class (I, II, III) and identifies appropriate product codes.
            </p>
            <p className="text-sm font-semibold text-green-600">
              90%+ accuracy when validated against FDA decisions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              Predicate Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Performs semantic analysis to find the most suitable predicate devices from the FDA database.
            </p>
            <p className="text-sm font-semibold text-green-600">
              Reduces research time from 2-3 days to &lt;2 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Comparative Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Generates detailed side-by-side comparisons between user devices and potential predicates.
            </p>
            <p className="text-sm font-semibold text-green-600">
              Complete comparison matrices with testing recommendations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Guidance Mapping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Automatically identifies and retrieves relevant FDA guidance documents and testing requirements.
            </p>
            <p className="text-sm font-semibold text-green-600">
              Always cites sources with URLs and effective dates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Compliance Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Creates customized 510(k) submission checklists based on device classification.
            </p>
            <p className="text-sm font-semibold text-green-600">
              Tailored specifically for FDA submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Maintains comprehensive, exportable audit logs of all AI decisions and reasoning.
            </p>
            <p className="text-sm font-semibold text-green-600">
              Complete reasoning traces for all conclusions
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}