/**
 * Next.js API Route for Project Dashboard Data
 * Proxies dashboard requests to FastAPI backend
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
    'Authorization': `Bearer ${session.accessToken || 'mock-token'}`,
    'Content-Type': 'application/json',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headers = await getAuthHeaders(request);
    const projectId = params.id;
    
    const response = await fetch(`${BACKEND_URL}/projects/${projectId}/dashboard`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          message: errorData.message || `Backend error: ${response.status}`,
          details: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Project dashboard API error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to get project dashboard', error: error.message },
      { status: 500 }
    );
  }
}