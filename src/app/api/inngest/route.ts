import { Inngest } from 'inngest';
import { serve } from 'inngest/next';

// Initialize Inngest client
export const inngest = new Inngest({
  id: 'manthan-os',
  eventKey: process.env.INNGEST_EVENT_KEY!,
  signingKey: process.env.INNGEST_SIGNING_KEY!
});

// Function 1: Extract text from uploaded document
const extractDocumentText = inngest.createFunction(
  {
    id: 'extract-document-text',
    retries: 3
  },
  { event: 'document.uploaded' },
  async ({ event, step }) => {
    const { documentId, storagePath } = event.data;

    // Step 1: Get document from database to ensure it exists and get storage path
    const document = await step.run('fetch-document', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw new Error(`Failed to fetch document: ${error.message}`);
      return data;
    });

    // Step 2: Generate signed URL for Railway worker access
    const signedUrl = await step.run('generate-signed-url', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { data: signedUrlData, error } = await supabase.storage
        .from('creator-assets')
        .createSignedUrl(document.storage_path || storagePath, 3600); // Valid for 1 hour

      if (error) throw new Error(`Failed to generate signed URL: ${error.message}`);
      return signedUrlData.signedUrl;
    });

    // Step 3: Call Railway worker to extract text
    const result = await step.run('call-railway-worker', async () => {
      const workerUrl = process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app';

      const response = await fetch(`${workerUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`
        },
        body: JSON.stringify({
          documentId,
          storageUrl: signedUrl
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Railway worker failed: ${errorText}`);
      }

      return await response.json();
    });

    // If extraction succeeded, trigger embedding generation
    if (result.success) {
      await step.sendEvent('trigger-embeddings', {
        name: 'document.extracted',
        data: {
          documentId,
          textLength: result.textLength
        }
      });
    }

    console.log('✅ Document text extracted successfully:', documentId);
    return { success: true, result };
  }
);

// Function 2: Generate embeddings after extraction
const generateEmbeddings = inngest.createFunction(
  {
    id: 'generate-embeddings',
    retries: 2
  },
  { event: 'document.extracted' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Verify document has extracted text
    await step.run('verify-extracted-text', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('documents')
        .select('id, extracted_text, processing_status')
        .eq('id', documentId)
        .single();

      if (error) throw new Error(`Failed to fetch document: ${error.message}`);
      if (!data.extracted_text) throw new Error('No extracted text found for document');

      return data;
    });

    // Step 2: Call Railway worker to generate embeddings
    const result = await step.run('call-railway-embed', async () => {
      const workerUrl = process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app';

      const response = await fetch(`${workerUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`
        },
        body: JSON.stringify({ documentId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding generation failed: ${errorText}`);
      }

      return await response.json();
    });

    console.log('✅ Document embeddings generated successfully:', documentId, `(${result.numChunks} chunks)`);
    return { success: true, result };
  }
);

// Serve Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    extractDocumentText,
    generateEmbeddings
  ]
});