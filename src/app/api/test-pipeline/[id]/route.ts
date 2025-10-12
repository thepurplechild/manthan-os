import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TestPipelineResult {
  documentId: string;
  step: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  timing: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const results: TestPipelineResult[] = [];

  try {
    // Step 1: Fetch document from database
    const step1Start = Date.now();
    const supabase = await createClient();

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    const step1Timing = Date.now() - step1Start;

    if (docError) {
      results.push({
        documentId,
        step: 'fetch-document',
        success: false,
        error: docError.message,
        timing: step1Timing
      });

      return NextResponse.json({
        success: false,
        results,
        summary: 'Failed to fetch document from database'
      });
    }

    results.push({
      documentId,
      step: 'fetch-document',
      success: true,
      data: {
        title: document.title,
        processing_status: document.processing_status,
        storage_path: document.storage_path,
        created_at: document.created_at
      },
      timing: step1Timing
    });

    // Step 2: Test Railway worker direct call - Extract
    const step2Start = Date.now();
    const workerUrl = process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app';

    try {
      const extractResponse = await fetch(`${workerUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`
        },
        body: JSON.stringify({
          documentId: documentId,
          storagePath: document.storage_path
        })
      });

      const step2Timing = Date.now() - step2Start;

      if (!extractResponse.ok) {
        const errorText = await extractResponse.text();
        results.push({
          documentId,
          step: 'railway-extract',
          success: false,
          error: `HTTP ${extractResponse.status}: ${errorText}`,
          timing: step2Timing
        });
      } else {
        const extractResult = await extractResponse.json();
        results.push({
          documentId,
          step: 'railway-extract',
          success: true,
          data: extractResult,
          timing: step2Timing
        });

        // Step 3: Test Railway worker direct call - Embed (only if extract succeeded)
        if (extractResult.success) {
          const step3Start = Date.now();

          try {
            const embedResponse = await fetch(`${workerUrl}/embed`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WORKER_SECRET}`
              },
              body: JSON.stringify({
                documentId: documentId
              })
            });

            const step3Timing = Date.now() - step3Start;

            if (!embedResponse.ok) {
              const errorText = await embedResponse.text();
              results.push({
                documentId,
                step: 'railway-embed',
                success: false,
                error: `HTTP ${embedResponse.status}: ${errorText}`,
                timing: step3Timing
              });
            } else {
              const embedResult = await embedResponse.json();
              results.push({
                documentId,
                step: 'railway-embed',
                success: true,
                data: embedResult,
                timing: step3Timing
              });
            }
          } catch (embedError) {
            results.push({
              documentId,
              step: 'railway-embed',
              success: false,
              error: `Network error: ${embedError instanceof Error ? embedError.message : String(embedError)}`,
              timing: Date.now() - step3Start
            });
          }
        }
      }
    } catch (extractError) {
      results.push({
        documentId,
        step: 'railway-extract',
        success: false,
        error: `Network error: ${extractError instanceof Error ? extractError.message : String(extractError)}`,
        timing: Date.now() - step2Start
      });
    }

    // Step 4: Check final document status
    const step4Start = Date.now();
    const { data: finalDocument } = await supabase
      .from('documents')
      .select('processing_status, extracted_text')
      .eq('id', documentId)
      .single();

    const step4Timing = Date.now() - step4Start;

    results.push({
      documentId,
      step: 'final-status-check',
      success: true,
      data: {
        processing_status: finalDocument?.processing_status,
        has_extracted_text: !!finalDocument?.extracted_text,
        text_length: finalDocument?.extracted_text?.length || 0
      },
      timing: step4Timing
    });

    // Step 5: Check if embeddings were generated
    const step5Start = Date.now();
    const { data: embeddings, count } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact' })
      .eq('document_id', documentId);

    const step5Timing = Date.now() - step5Start;

    results.push({
      documentId,
      step: 'check-embeddings',
      success: true,
      data: {
        embedding_count: count || 0,
        sample_sections: embeddings?.slice(0, 3).map(section => ({
          id: section.id,
          content_preview: section.content?.substring(0, 100) + '...',
          has_embedding: !!section.embedding
        })) || []
      },
      timing: step5Timing
    });

    const totalTiming = results.reduce((sum, result) => sum + result.timing, 0);
    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: successCount === results.length,
      documentId,
      results,
      summary: {
        total_steps: results.length,
        successful_steps: successCount,
        failed_steps: results.length - successCount,
        total_time_ms: totalTiming,
        worker_url: workerUrl,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      documentId,
      results,
      error: error instanceof Error ? error.message : String(error),
      summary: 'Pipeline test failed with unexpected error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;

  try {
    // Trigger Inngest function directly
    const { inngest } = await import('../../inngest/route');

    // Send the document.uploaded event to trigger the pipeline
    await inngest.send({
      name: 'document.uploaded',
      data: {
        documentId,
        storagePath: 'test', // Will be fetched from DB in the function
        userId: 'test-user'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Triggered Inngest pipeline for document ${documentId}`,
      documentId
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to trigger Inngest pipeline'
    }, { status: 500 });
  }
}