// Frontend health check API endpoint
import { NextApiRequest, NextApiResponse } from 'next';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  details?: any;
  error?: string;
  responseTime?: number;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  checks: HealthCheck[];
  uptime: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Check backend API connectivity
  const backendCheck = await checkBackendAPI();
  checks.push(backendCheck);
  if (backendCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (
    backendCheck.status === 'degraded' &&
    overallStatus === 'healthy'
  ) {
    overallStatus = 'degraded';
  }

  // Check environment variables
  const envCheck = checkEnvironmentVariables();
  checks.push(envCheck);
  if (envCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  }

  // Check Next.js configuration
  const nextCheck = checkNextJSConfig();
  checks.push(nextCheck);
  if (nextCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  }

  // Check authentication configuration
  const authCheck = checkAuthConfig();
  checks.push(authCheck);
  if (authCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: 'medical-device-regulatory-assistant-frontend',
    version: process.env.npm_package_version || '0.1.0',
    checks,
    uptime: process.uptime(),
  };

  // Set appropriate HTTP status code
  const statusCode =
    overallStatus === 'healthy'
      ? 200
      : overallStatus === 'degraded'
        ? 200
        : 503;

  res.status(statusCode).json(response);
}

async function checkBackendAPI(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        name: 'backend_api',
        status: data.healthy ? 'healthy' : 'degraded',
        details: {
          url: backendUrl,
          status_code: response.status,
          backend_checks: data.checks,
        },
        responseTime,
      };
    } 
      return {
        name: 'backend_api',
        status: 'unhealthy',
        error: `Backend API returned status ${response.status}`,
        details: {
          url: backendUrl,
          status_code: response.status,
        },
        responseTime,
      };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      name: 'backend_api',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    };
  }
}

function checkEnvironmentVariables(): HealthCheck {
  const requiredEnvVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_API_URL',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length === 0) {
    return {
      name: 'environment_variables',
      status: 'healthy',
      details: {
        required_vars: requiredEnvVars.length,
        configured_vars: requiredEnvVars.length - missingVars.length,
      },
    };
  } 
    return {
      name: 'environment_variables',
      status: 'unhealthy',
      error: `Missing required environment variables: ${missingVars.join(', ')}`,
      details: {
        required_vars: requiredEnvVars.length,
        configured_vars: requiredEnvVars.length - missingVars.length,
        missing_vars: missingVars,
      },
    };
  
}

function checkNextJSConfig(): HealthCheck {
  try {
    // Check if we're in the correct environment
    const nodeEnv = process.env.NODE_ENV;
    const isProduction = nodeEnv === 'production';
    const isDevelopment = nodeEnv === 'development';

    // Basic Next.js configuration checks
    const details = {
      node_env: nodeEnv,
      next_version: process.env.npm_package_dependencies_next || 'unknown',
      build_id: process.env.NEXT_BUILD_ID || 'development',
    };

    return {
      name: 'nextjs_config',
      status: 'healthy',
      details,
    };
  } catch (error) {
    return {
      name: 'nextjs_config',
      status: 'unhealthy',
      error:
        error instanceof Error ? error.message : 'Configuration check failed',
    };
  }
}

function checkAuthConfig(): HealthCheck {
  try {
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const issues: string[] = [];

    // Check NextAuth URL format
    if (nextAuthUrl && !nextAuthUrl.startsWith('http')) {
      issues.push('NEXTAUTH_URL should start with http:// or https://');
    }

    // Check secret length (should be at least 32 characters)
    if (nextAuthSecret && nextAuthSecret.length < 32) {
      issues.push('NEXTAUTH_SECRET should be at least 32 characters long');
    }

    // Check Google OAuth configuration
    if (googleClientId && !googleClientId.includes('.googleusercontent.com')) {
      issues.push('GOOGLE_CLIENT_ID format appears invalid');
    }

    if (issues.length === 0) {
      return {
        name: 'auth_config',
        status: 'healthy',
        details: {
          nextauth_configured: !!nextAuthUrl && !!nextAuthSecret,
          google_oauth_configured: !!googleClientId && !!googleClientSecret,
        },
      };
    } 
      return {
        name: 'auth_config',
        status: 'degraded',
        error: `Configuration issues: ${issues.join(', ')}`,
        details: {
          issues,
          nextauth_configured: !!nextAuthUrl && !!nextAuthSecret,
          google_oauth_configured: !!googleClientId && !!googleClientSecret,
        },
      };
    
  } catch (error) {
    return {
      name: 'auth_config',
      status: 'unhealthy',
      error:
        error instanceof Error
          ? error.message
          : 'Auth configuration check failed',
    };
  }
}
