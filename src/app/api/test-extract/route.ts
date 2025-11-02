import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');

  if (!documentId) {
    return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
  }

  try {
    // Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch document and verify ownership
    const { data: document, error } = await supabase
      .from('documents')
      .select('id, title, storage_url, owner_id')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify ownership
    if (document.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Call Railway worker
    const workerUrl = process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app';

    if (!process.env.WORKER_SECRET) {
      return NextResponse.json({ error: 'Worker secret not configured' }, { status: 500 });
    }

    const response = await fetch(`${workerUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_SECRET}`
      },
      body: JSON.stringify({
        documentId: documentId,
        storageUrl: document.storage_url,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: 'Worker request failed',
        status: response.status,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      document: {
        id: document.id,
        title: document.title,
      },
      worker_response: result,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Don't expose stack traces in production
    const isDev = process.env.NODE_ENV === 'development';
    
    return NextResponse.json({
      error: errorMessage,
      ...(isDev && error instanceof Error ? { stack: error.stack } : {})
    }, { status: 500 });
  }
}