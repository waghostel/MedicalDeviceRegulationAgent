/**
 * Next.js API Route for Agent Session Streaming
 * Proxies SSE stream from FastAPI backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function getAuthHeaders(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  return {
    Authorization: `Bearer ${session.accessToken || 'mock-token'}`,
    Accept: 'text/event-stream',
    'Cache-Control': 'no-cache',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const headers = await getAuthHeaders(request);
    const {sessionId} = params;

    // Create a readable stream that proxies the backend SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(
            `${BACKEND_URL}/api/agent/session/${sessionId}/stream`,
            {
              method: 'GET',
              headers,
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = `data: ${JSON.stringify({
              event: 'error',
              data: errorData.message || `Backend error: ${response.status}`,
            })}\n\n`;

            controller.enqueue(new TextEncoder().encode(errorMessage));
            controller.close();
            return;
          }

          if (!response.body) {
            controller.close();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        } catch (error) {
          console.error('SSE proxy error:', error);
          const errorMessage = `data: ${JSON.stringify({
            event: 'error',
            data: `Stream error: ${error.message}`,
          })}\n\n`;

          controller.enqueue(new TextEncoder().encode(errorMessage));
          controller.close();
        }
      },

      cancel() {
        // Handle client disconnect
        console.log('SSE stream cancelled by client');
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('Agent session stream API error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to stream session updates', error: error.message },
      { status: 500 }
    );
  }
}
