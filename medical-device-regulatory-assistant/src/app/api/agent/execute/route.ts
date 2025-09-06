/**
 * Next.js API Route for Agent Task Execution
 * Proxies agent execution requests to FastAPI backend
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

export async function POST(request: NextRequest) {
  try {
    const headers = await getAuthHeaders(request);
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['task_type', 'project_id', 'device_description', 'intended_use'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    const response = await fetch(`${BACKEND_URL}/api/agent/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
    console.error('Agent execute API error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to execute agent task', error: error.message },
      { status: 500 }
    );
  }
}