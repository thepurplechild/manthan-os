export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');

  if (!documentId) {
    return Response.json({ error: 'Missing document ID' }, { status: 400 });
  }

  try {
    // 1. Fetch document
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // 2. Call Railway worker
    const workerUrl = process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app';

    const response = await fetch(`${workerUrl}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        storage_url: document.storage_url,
      }),
    });

    const result = await response.json();

    return Response.json({
      success: response.ok,
      status: response.status,
      document: {
        id: document.id,
        title: document.title,
        storage_url: document.storage_url,
      },
      worker_response: result,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return Response.json({
      error: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
}