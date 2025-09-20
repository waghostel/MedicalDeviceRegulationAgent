/**
 * Next.js API Routes for Project Management
 * Proxies requests to FastAPI backend with authentication
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
    'Content-Type': 'application/json',
  };
}

export async function GET(request: NextRequest) {
  try {
    const headers = await getAuthHeaders(request);
    const { searchParams } = new URL(request.url);

    // Forward query parameters to backend
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/projects${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          message: errorData.message || `Backend error: ${response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Projects API error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers = await getAuthHeaders(request);
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          message: errorData.message || `Backend error: ${response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create project API error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to create project', error: error.message },
      { status: 500 }
    );
  }
}
