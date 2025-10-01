'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import pdf from 'pdf-parse'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AnalysisResult {
  characters: Array<{
    name: string
    description: string
  }>
  scenes: Array<{
    heading: string
    location: string
    timeOfDay?: string
  }>
  dialogue: Array<{
    character: string
    text: string
    context?: string
  }>
}

export async function processDocument(documentId: string) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  try {
    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (docError || !document) {
      return { error: 'Document not found' }
    }

    // Check if document is in correct status
    if (document.processing_status !== 'UPLOADED') {
      return { error: 'Document is not in uploadable status' }
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ processing_status: 'PROCESSING' })
      .eq('id', documentId)

    // Get signed URL for download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('creator-assets')
      .createSignedUrl(document.storage_path, 3600)

    if (urlError || !signedUrlData?.signedUrl) {
      throw new Error('Failed to get signed URL for document')
    }

    // Download PDF content
    const response = await fetch(signedUrlData.signedUrl)
    if (!response.ok) {
      throw new Error('Failed to download document')
    }

    const buffer = await response.arrayBuffer()
    const pdfData = await pdf(Buffer.from(buffer))
    const textContent = pdfData.text

    if (!textContent.trim()) {
      throw new Error('No text content found in document')
    }

    // Send to OpenAI for analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a screenplay analyzer. Extract structured data from scripts and return valid JSON only. Focus on characters with descriptions, scene headings with locations, and key dialogue exchanges.'
        },
        {
          role: 'user',
          content: `Analyze this screenplay text and return JSON with the following structure:
{
  "characters": [{"name": "string", "description": "string"}],
  "scenes": [{"heading": "string", "location": "string", "timeOfDay": "string"}],
  "dialogue": [{"character": "string", "text": "string", "context": "string"}]
}

Text to analyze:
${textContent}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      throw new Error('No response from OpenAI')
    }

    let analysisResult: AnalysisResult
    try {
      analysisResult = JSON.parse(analysisText)
    } catch {
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Store results in document_sections table
    const sectionsToInsert = [
      {
        document_id: documentId,
        section_type: 'characters',
        content: analysisResult.characters
      },
      {
        document_id: documentId,
        section_type: 'scenes',
        content: analysisResult.scenes
      },
      {
        document_id: documentId,
        section_type: 'dialogue',
        content: analysisResult.dialogue
      }
    ]

    const { error: insertError } = await supabase
      .from('document_sections')
      .insert(sectionsToInsert)

    if (insertError) {
      throw new Error(`Failed to store analysis results: ${insertError.message}`)
    }

    // Update document status to completed
    await supabase
      .from('documents')
      .update({ processing_status: 'COMPLETED' })
      .eq('id', documentId)

    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')

    return { success: true, analysis: analysisResult }

  } catch (error) {
    // Update document status to failed
    await supabase
      .from('documents')
      .update({ processing_status: 'FAILED' })
      .eq('id', documentId)

    console.error('Document processing error:', error)
    return {
      error: error instanceof Error ? error.message : 'Processing failed'
    }
  }
}