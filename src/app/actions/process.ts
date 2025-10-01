'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processDocument(documentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  try {
    // Update status to PROCESSING
    await supabase
      .from('documents')
      .update({ processing_status: 'PROCESSING' })
      .eq('id', documentId)

    // Get document with extracted text
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, extracted_text')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    // Validate extracted text exists
    if (!document.extracted_text || document.extracted_text.trim() === '') {
      throw new Error('No text found in document. Please re-upload.')
    }

    const text = document.extracted_text

    // Send to OpenAI
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a screenplay analyzer. Extract structured data from scripts and return valid JSON only.',
        },
        {
          role: 'user',
          content: `Analyze this screenplay and extract:
1. All CHARACTER names with brief descriptions
2. All SCENE headings with locations and times
3. Key DIALOGUE exchanges (5-10 most important)

Return as JSON with this exact structure:
{
  "characters": [{"name": "CHARACTER NAME", "description": "brief description"}],
  "scenes": [{"heading": "SCENE HEADING", "location": "location", "time": "DAY/NIGHT"}],
  "dialogue": [{"character": "CHARACTER", "line": "dialogue text", "context": "context"}]
}

Script text:
${text.slice(0, 50000)}`,
        },
      ],
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // Store sections
    const sections = [
      {
        document_id: documentId,
        section_type: 'CHARACTERS',
        content: { characters: result.characters || [] },
      },
      {
        document_id: documentId,
        section_type: 'SCENES',
        content: { scenes: result.scenes || [] },
      },
      {
        document_id: documentId,
        section_type: 'DIALOGUE',
        content: { dialogue: result.dialogue || [] },
      },
    ]

    const { error: sectionsError } = await supabase
      .from('document_sections')
      .insert(sections)

    if (sectionsError) {
      throw new Error('Failed to save analysis results')
    }

    // Update status to COMPLETED
    await supabase
      .from('documents')
      .update({ processing_status: 'COMPLETED' })
      .eq('id', documentId)

    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    // Update status to FAILED
    await supabase
      .from('documents')
      .update({ processing_status: 'FAILED' })
      .eq('id', documentId)

    return { error: error instanceof Error ? error.message : 'Processing failed' }
  }
}