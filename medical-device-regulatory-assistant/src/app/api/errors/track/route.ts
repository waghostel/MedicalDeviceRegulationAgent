import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API endpoint for tracking frontend errors
 * Integrates with the backend error tracking system
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const errorReport = await request.json();

    // Add session information if available
    const enhancedReport = {
      ...errorReport,
      context: {
        ...errorReport.context,
        userId: session?.user?.id,
        sessionId: session?.user?.id ? `session-${session.user.id}` : undefined,
      },
    };

    // Forward to backend error tracking service
    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/api/errors/track`,
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
        `Backend error tracking failed: ${backendResponse.status}`
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json({
      success: true,
      errorId: result.errorId,
      message: 'Error tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking API failed:', error);

    // Fallback: log locally if backend is unavailable
    const fallbackErrorId = `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.error('Frontend Error Report:', {
      errorId: fallbackErrorId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      originalReport: await request.json().catch(() => ({})),
    });

    return NextResponse.json(
      {
        success: true,
        errorId: fallbackErrorId,
        message: 'Error logged locally (backend unavailable)',
      },
      { status: 200 }
    ); // Return 200 to prevent frontend error cascade
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Error tracking endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
