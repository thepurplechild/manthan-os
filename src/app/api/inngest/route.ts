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
    retries: 3,
  },
  { event: 'document.uploaded' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Fetch document with its public storage_url
    const document = await step.run('fetch-document', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('documents')
        .select('id, storage_url, storage_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw new Error(`Document fetch failed: ${error?.message || 'Not found'}`);
      }

      console.log('📄 Document fetched:', data.title, data.id);
      console.log('📍 Storage URL:', data.storage_url);
      return data;
    });

    // Call Railway worker with public URL
    const result = await step.run('extract-text', async () => {
      const workerUrl = process.env.RAILWAY_WORKER_URL || 'https://manthan-os-production.up.railway.app';

      console.log('🚂 Calling Railway:', `${workerUrl}/extract`);

      const response = await fetch(`${workerUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`, // Add auth
        },
        body: JSON.stringify({
          documentId: documentId,        // Change to camelCase
          storageUrl: document.storage_url, // Change to camelCase
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Railway extraction failed:', errorText);
        throw new Error(`Extraction failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Text extracted:', data.character_count || 'unknown', 'characters');
      return data;
    });

    return { success: true, ...result };
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