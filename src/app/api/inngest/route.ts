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

    // Call Railway worker to extract text
    const result = await step.run('call-railway-extract', async () => {
      const response = await fetch(`${process.env.RAILWAY_WORKER_URL}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`
        },
        body: JSON.stringify({
          documentId,
          storagePath
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Railway worker failed: ${error}`);
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

    const result = await step.run('call-railway-embed', async () => {
      const response = await fetch(`${process.env.RAILWAY_WORKER_URL}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`
        },
        body: JSON.stringify({ documentId })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding generation failed: ${error}`);
      }

      return await response.json();
    });

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