import { createBharatDiffusionJob, waitForBharatDiffusionJob } from '@/lib/api/bharatDiffusion';

export async function GET() {
  try {
    console.log('[TEST] Testing BharatDiffusion API connection...');

    // Test job creation
    const testJob = await createBharatDiffusionJob({
      prompt: 'a majestic tiger in the forest',
      style: 'realistic',
      aspectRatio: 'square',
    });

    if (!testJob.success) {
      console.error('[TEST] Job creation failed:', testJob.error);
      return Response.json({
        error: testJob.error,
        step: 'job_creation'
      }, { status: 500 });
    }

    console.log('[TEST] Job created successfully:', testJob.jobId);

    // Test job polling (with shorter timeout for testing)
    const result = await waitForBharatDiffusionJob(testJob.jobId!, 60000, 2000); // 1 min, poll every 2s

    if (!result.success) {
      console.error('[TEST] Job completion failed:', result.error);
      return Response.json({
        error: result.error,
        step: 'job_completion',
        jobId: testJob.jobId
      }, { status: 500 });
    }

    console.log('[TEST] Test completed successfully!');

    return Response.json({
      success: true,
      message: 'BharatDiffusion API test completed successfully',
      jobId: testJob.jobId,
      imageUrl: result.imageUrl,
      step: 'completed'
    });

  } catch (error) {
    console.error('[TEST] Unexpected error:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'unexpected_error'
    }, { status: 500 });
  }
}