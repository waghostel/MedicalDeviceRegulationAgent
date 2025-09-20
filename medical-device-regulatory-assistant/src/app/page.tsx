import { AppLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Medical Device Regulatory Assistant
          </h1>
          <p className="text-muted-foreground">
            AI-powered regulatory pathway discovery for medical device companies
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Project Status
              </CardTitle>
              <Badge variant="secondary">MVP</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Setup Complete</div>
              <p className="text-xs text-muted-foreground">
                Core infrastructure initialized
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Phase 1</div>
              <p className="text-xs text-muted-foreground">
                Frontend foundation and UI components
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Focus Area</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">510(k)</div>
              <p className="text-xs text-muted-foreground">
                Predicate search and analysis workflow
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Welcome to the Medical Device Regulatory Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              This AI-powered platform streamlines the regulatory process for
              medical device companies, with an initial focus on the US FDA
              market and 510(k) predicate search workflows.
            </p>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                Core Capabilities (Coming Soon)
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Auto-classification with FDA product codes</li>
                <li>Predicate search & analysis with comparison tables</li>
                <li>FDA guidance document mapping</li>
                <li>Real-time FDA database integration</li>
                <li>510(k) submission checklist generator</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Current Status:</strong> Project setup and core
                infrastructure complete. Ready to begin Phase 1 development.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
