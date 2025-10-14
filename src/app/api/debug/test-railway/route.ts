import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const workerUrl = process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app';

    // Test basic health endpoint
    const healthResponse = await fetch(`${workerUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const healthData = await healthResponse.json().catch(() => null);

    // Test if worker endpoints exist
    const endpointTests = [
      { name: 'extract', path: '/extract' },
      { name: 'health', path: '/health' },
    ];

    const endpointResults = await Promise.all(
      endpointTests.map(async (endpoint) => {
        try {
          const response = await fetch(`${workerUrl}${endpoint.path}`, {
            method: 'OPTIONS', // Use OPTIONS to test if endpoint exists without side effects
            headers: { 'Content-Type': 'application/json' },
          });

          return {
            name: endpoint.name,
            path: endpoint.path,
            accessible: response.status !== 404,
            status: response.status,
          };
        } catch (error) {
          return {
            name: endpoint.name,
            path: endpoint.path,
            accessible: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({
      success: healthResponse.ok,
      worker_url: workerUrl,
      health_status: healthResponse.status,
      health_data: healthData,
      endpoints: endpointResults,
      environment: {
        RAILWAY_WORKER_URL: process.env.RAILWAY_WORKER_URL || 'not set (using default)',
        WORKER_SECRET: process.env.WORKER_SECRET ? 'set' : 'not set',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
      worker_url: process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}