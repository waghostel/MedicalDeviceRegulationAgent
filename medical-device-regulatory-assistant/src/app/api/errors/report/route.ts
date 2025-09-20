import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API endpoint for detailed error reporting with user feedback
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const detailedReport = await request.json();

    // Add session information if available
    const enhancedReport = {
      ...detailedReport,
      context: {
        ...detailedReport.context,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionId: session?.user?.id ? `session-${session.user.id}` : undefined,
      },
      reportType: 'user_reported',
      priority: 'high', // User-reported errors get higher priority
    };

    // Forward to backend error reporting service
    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/api/errors/report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
        },
        body: JSON.stringify(enhancedReport),
      }
    );

    if (!backendResponse.ok) {
      throw new Error(
        `Backend error reporting failed: ${backendResponse.status}`
      );
    }

    const result = await backendResponse.json();

    // Send notification to development team for user-reported errors
    if (process.env.NODE_ENV === 'production') {
      try {
        await sendErrorNotification(enhancedReport);
      } catch (notificationError) {
        console.error('Failed to send error notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      reportId: result.reportId,
      message: 'Error report submitted successfully',
      ticketNumber: result.ticketNumber || `ERR-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error reporting API failed:', error);

    // Fallback: create local error report
    const fallbackReportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.error('Frontend Error Report (Detailed):', {
      reportId: fallbackReportId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      originalReport: await request.json().catch(() => ({})),
    });

    return NextResponse.json(
      {
        success: true,
        reportId: fallbackReportId,
        message: 'Error report logged locally (backend unavailable)',
        ticketNumber: `LOCAL-${fallbackReportId}`,
      },
      { status: 200 }
    );
  }
}

async function sendErrorNotification(errorReport: any) {
  // This would integrate with your notification system (email, Slack, etc.)
  // For now, just log the high-priority error
  console.error('HIGH PRIORITY: User-reported error', {
    errorId: errorReport.errorId,
    userId: errorReport.context.userId,
    userEmail: errorReport.context.userEmail,
    url: errorReport.context.url,
    error: errorReport.error.message,
    timestamp: errorReport.context.timestamp,
  });

  // TODO: Integrate with actual notification service
  // Examples:
  // - Send email to development team
  // - Post to Slack channel
  // - Create ticket in issue tracking system
  // - Send to PagerDuty for critical errors
}
