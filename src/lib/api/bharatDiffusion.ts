'use server';

const PIXELBIN_API_BASE = 'https://api.pixelbin.io';
const ORG_ID = process.env.PIXELBIN_ORG_ID!;
const ACCESS_TOKEN = process.env.PIXELBIN_ACCESS_TOKEN!;

interface BharatDiffusionRequest {
  prompt: string;
  style?: 'realistic' | 'cinematic' | 'cyberpunk' | 'anime' | 'oil_painting' | 'watercolor';
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  negativePrompt?: string;
}

interface BharatDiffusionJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

/**
 * Validate environment variables on module load
 */
function validateEnvironment() {
  const missing: string[] = [];
  
  if (!process.env.PIXELBIN_ORG_ID) missing.push('PIXELBIN_ORG_ID');
  if (!process.env.PIXELBIN_ACCESS_TOKEN) missing.push('PIXELBIN_ACCESS_TOKEN');
  
  if (missing.length > 0) {
    throw new Error(`Missing BharatDiffusion environment variables: ${missing.join(', ')}`);
  }
  
  console.log('[BharatDiffusion] Environment variables validated ✓');
}

// Validate on module load
validateEnvironment();

/**
 * Create a new BharatDiffusion image generation job
 * This is an async operation that returns immediately with a jobId
 */
export async function createBharatDiffusionJob(
  params: BharatDiffusionRequest
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    console.log('[BharatDiffusion] Creating job with params:', {
      prompt: params.prompt.substring(0, 50) + '...',
      style: params.style,
      aspectRatio: params.aspectRatio,
    });
    console.log('[BharatDiffusion] Using Access Token:', ACCESS_TOKEN.substring(0, 10) + '...');
    console.log('[BharatDiffusion] Organization ID:', ORG_ID);

    const endpoint = `${PIXELBIN_API_BASE}/service/platform/assets/v1.0/organization/${ORG_ID}/plugins/bharatDiffusion_generate`;
    
    console.log('[BharatDiffusion] Endpoint:', endpoint);

    const requestBody = {
      prompt: params.prompt,
      style: params.style || 'realistic',
      aspectRatio: params.aspectRatio || 'square',
      negativePrompt: params.negativePrompt || 'blurry, low quality, distorted',
    };

    console.log('[BharatDiffusion] Request body:', requestBody);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[BharatDiffusion] Response status:', response.status);
    console.log('[BharatDiffusion] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BharatDiffusion] API error response:', errorText);
      
      // Provide specific error messages based on status code
      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please verify your PIXELBIN_ACCESS_TOKEN is correct.',
        };
      }
      
      if (response.status === 403) {
        return {
          success: false,
          error: 'Access denied. Check if BharatDiffusion plugin is activated in your PixelBin account.',
        };
      }
      
      if (response.status === 404) {
        return {
          success: false,
          error: 'Endpoint not found. Verify your PIXELBIN_ORG_ID is correct.',
        };
      }
      
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    console.log('[BharatDiffusion] Job creation response:', data);

    // Try common field names for job ID
    const jobId = data.jobId || data.id || data._id || data.job_id || data.requestId;

    if (!jobId) {
      console.error('[BharatDiffusion] No job ID in response. Full response:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: 'No job ID returned from API. Response: ' + JSON.stringify(data),
      };
    }

    console.log('[BharatDiffusion] Job created successfully with ID:', jobId);

    return {
      success: true,
      jobId: String(jobId),
    };
  } catch (error) {
    console.error('[BharatDiffusion] Create job exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating job',
    };
  }
}

/**
 * Check the status of a BharatDiffusion job
 */
export async function getBharatDiffusionJobStatus(
  jobId: string
): Promise<{ success: boolean; data?: BharatDiffusionJob; error?: string }> {
  try {
    // Try multiple possible endpoint formats
    const possibleEndpoints = [
      `${PIXELBIN_API_BASE}/service/platform/assets/v1.0/organization/${ORG_ID}/jobs/${jobId}`,
      `${PIXELBIN_API_BASE}/service/platform/jobs/${jobId}`,
      `${PIXELBIN_API_BASE}/service/platform/assets/v1.0/organization/${ORG_ID}/plugins/bharatDiffusion/${jobId}`,
    ];

    for (const endpoint of possibleEndpoints) {
      console.log('[BharatDiffusion] Checking job status at:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      console.log('[BharatDiffusion] Status check response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[BharatDiffusion] Job status data:', data);

        // Extract status (handle different possible field names)
        const status = data.status || data.state || data.jobStatus;
        
        // Extract image URL (handle different possible locations)
        const imageUrl = 
          data.imageUrl || 
          data.image_url || 
          data.url ||
          data.result?.imageUrl || 
          data.result?.image_url ||
          data.result?.url ||
          data.output?.url;

        return {
          success: true,
          data: {
            jobId: data.jobId || data.id || jobId,
            status: status || 'unknown',
            imageUrl: imageUrl,
            error: data.error || data.error_message || data.errorMessage,
          },
        };
      }

      // If 404, try next endpoint
      if (response.status === 404) {
        console.log('[BharatDiffusion] Endpoint returned 404, trying next...');
        continue;
      }

      // For other errors, log and break
      const errorText = await response.text();
      console.error('[BharatDiffusion] Status check error:', response.status, errorText);
      break;
    }

    return {
      success: false,
      error: 'Failed to get job status from any endpoint',
    };
  } catch (error) {
    console.error('[BharatDiffusion] Status check exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking job status',
    };
  }
}

/**
 * Poll job until completion with exponential backoff
 */
export async function waitForBharatDiffusionJob(
  jobId: string,
  maxWaitMs: number = 120000, // 2 minutes
  initialPollIntervalMs: number = 3000 // Start with 3 seconds
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const startTime = Date.now();
  let attempts = 0;
  let pollInterval = initialPollIntervalMs;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[BharatDiffusion] Poll attempt ${attempts}, elapsed: ${elapsed}s`);

    const statusResult = await getBharatDiffusionJobStatus(jobId);

    if (!statusResult.success) {
      console.log('[BharatDiffusion] Status check failed, retrying...');
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      // Exponential backoff: increase interval slightly each time
      pollInterval = Math.min(pollInterval * 1.2, 10000); // Max 10 seconds
      continue;
    }

    const jobData = statusResult.data!;
    console.log('[BharatDiffusion] Current job status:', jobData.status);

    // Check for completion
    if (jobData.status === 'completed' || jobData.status === 'success') {
      if (jobData.imageUrl) {
        console.log('[BharatDiffusion] ✓ Job completed successfully!');
        console.log('[BharatDiffusion] Image URL:', jobData.imageUrl);
        return {
          success: true,
          imageUrl: jobData.imageUrl,
        };
      } else {
        console.error('[BharatDiffusion] Job marked complete but no image URL');
        return {
          success: false,
          error: 'Job completed but no image URL was provided',
        };
      }
    }

    // Check for failure
    if (jobData.status === 'failed' || jobData.status === 'error') {
      console.error('[BharatDiffusion] ✗ Job failed:', jobData.error);
      return {
        success: false,
        error: jobData.error || 'Image generation failed',
      };
    }

    // Still processing
    console.log(`[BharatDiffusion] Job still ${jobData.status}, waiting ${pollInterval}ms...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    // Exponential backoff
    pollInterval = Math.min(pollInterval * 1.2, 10000);
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.error(`[BharatDiffusion] ✗ Timeout after ${totalTime}s`);
  
  return {
    success: false,
    error: `Image generation timed out after ${totalTime} seconds. The job may still be processing.`,
  };
}

/**
 * All-in-one function: Create job and wait for completion
 * This is the main function you should use
 */
export async function generateBharatDiffusionImage(
  params: BharatDiffusionRequest
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  console.log('[BharatDiffusion] ========================================');
  console.log('[BharatDiffusion] Starting new image generation request');
  console.log('[BharatDiffusion] ========================================');

  // Step 1: Create the job
  const createResult = await createBharatDiffusionJob(params);

  if (!createResult.success || !createResult.jobId) {
    console.error('[BharatDiffusion] ✗ Failed to create job');
    return {
      success: false,
      error: createResult.error || 'Failed to create generation job',
    };
  }

  console.log('[BharatDiffusion] ✓ Job created, now waiting for completion...');
  console.log('[BharatDiffusion] Job ID:', createResult.jobId);

  // Step 2: Wait for job to complete
  const result = await waitForBharatDiffusionJob(createResult.jobId);

  if (result.success) {
    console.log('[BharatDiffusion] ========================================');
    console.log('[BharatDiffusion] ✓ Image generation completed successfully');
    console.log('[BharatDiffusion] ========================================');
  } else {
    console.error('[BharatDiffusion] ========================================');
    console.error('[BharatDiffusion] ✗ Image generation failed');
    console.error('[BharatDiffusion] ========================================');
  }

  return result;
}

/**
 * Utility function to test the API connection
 */
export async function testBharatDiffusionConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  console.log('[BharatDiffusion] Testing API connection...');
  
  try {
    // Test with a simple prompt
    const result = await generateBharatDiffusionImage({
      prompt: 'a simple red circle on white background',
      style: 'realistic',
      aspectRatio: 'square',
    });

    if (result.success) {
      return {
        success: true,
        message: 'BharatDiffusion API connection successful!',
        details: {
          imageUrl: result.imageUrl,
        },
      };
    } else {
      return {
        success: false,
        message: 'BharatDiffusion API test failed',
        details: {
          error: result.error,
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'BharatDiffusion API test threw an exception',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}