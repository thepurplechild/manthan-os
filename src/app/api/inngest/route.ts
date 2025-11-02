import { Inngest } from 'inngest';
import { serve } from 'inngest/next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Validate required environment variables
function validateEnvVars() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY',
    'RAILWAY_WORKER_URL',
    'WORKER_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate on module load
try {
  validateEnvVars();
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  // Don't throw - allow server to start but log error
}

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
    // Trim whitespace from documentId
    const documentId = event.data.documentId?.trim();

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    console.log('🔍 Processing document:', documentId);

    // Fetch document with its public storage_url
    const document = await step.run('fetch-document', async () => {
      // Validate env vars before use
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration missing');
      }

      // Use direct Supabase client (works in serverless context)
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      console.log('🔍 Fetching document:', documentId);

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, storage_url, storage_path, processing_status')
        .eq('id', documentId)
        .maybeSingle();

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        console.error('❌ No document found with ID:', documentId);
        throw new Error(`Document not found: ${documentId}`);
      }

      console.log('✅ Document found:', data.title);
      return data;
    });

    // Call Railway worker with public URL
    const extractionResult = await step.run('call-railway-worker', async () => {
      console.log('🔄 Calling Railway worker for text extraction');

      if (!process.env.RAILWAY_WORKER_URL || !process.env.WORKER_SECRET) {
        throw new Error('Worker configuration missing');
      }

      const workerUrl = process.env.RAILWAY_WORKER_URL;

      const response = await fetch(`${workerUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`,
        },
        body: JSON.stringify({
          documentId: documentId,
          storageUrl: document.storage_url,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Railway worker failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Railway extraction completed');
      return data;
    });

    // NEW: Send document.extracted event after successful extraction
    await step.run('send-extracted-event', async () => {
      console.log('📤 Sending document.extracted event');

      await inngest.send({
        name: 'document.extracted',
        data: {
          documentId: documentId,
          textLength: extractionResult.textLength || 0
        }
      });

      console.log('✅ document.extracted event sent');
    });

    return { success: true, message: 'Text extraction completed' };
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
    // Trim whitespace from documentId
    const documentId = event.data.documentId?.trim();

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    console.log('🔍 Processing document:', documentId);

    // Step 1: Verify document has extracted text
    await step.run('verify-extracted-text', async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration missing');
      }

      // Use direct Supabase client (works in serverless context)
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

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
      if (!process.env.RAILWAY_WORKER_URL || !process.env.WORKER_SECRET) {
        throw new Error('Worker configuration missing');
      }

      const workerUrl = process.env.RAILWAY_WORKER_URL;

      const response = await fetch(`${workerUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`
        },
        body: JSON.stringify({ documentId })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
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