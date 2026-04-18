'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProcessingStatus } from '@/lib/database.types'

export async function processDocument(documentId: string) {
  console.log('🔄 Server Action: processDocument called with documentId:', documentId)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('👤 Server Action: User authentication result:', user ? 'authenticated' : 'not authenticated')

  if (!user) {
    console.error('❌ Server Action: User not authenticated')
    return { error: 'Unauthorized' }
  }

  try {
    // Update status to PROCESSING
    console.log('📊 Server Action: Updating document status to PROCESSING...')
    const statusUpdateResult = await supabase
      .from('documents')
      .update({ processing_status: 'PROCESSING' as ProcessingStatus })
      .eq('id', documentId)

    if (statusUpdateResult.error) {
      console.error('❌ Server Action: Failed to update status to PROCESSING:', statusUpdateResult.error)
    } else {
      console.log('✅ Server Action: Successfully updated status to PROCESSING')
    }

    // Get document with extracted text
    console.log('📄 Server Action: Fetching document with extracted text...')
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, extracted_text')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error('❌ Server Action: Document not found:', docError)
      throw new Error('Document not found')
    }

    console.log('📋 Server Action: Document found. Text length:', document.extracted_text?.length || 0)

    // Validate extracted text exists
    if (!document.extracted_text || document.extracted_text.trim() === '') {
      console.error('❌ Server Action: No extracted text found in document')
      throw new Error('No text found in document. Please re-upload.')
    }

    const text = document.extracted_text
    console.log('📝 Server Action: Using extracted text of length:', text.length)

    // Send to Claude
    console.log('🤖 Server Action: Initializing Anthropic client...')
    const { default: Anthropic } = await import('@anthropic-ai/sdk')

    const apiKey = process.env.ANTHROPIC_API_KEY
    console.log('🔑 Server Action: Anthropic API key available:', apiKey ? 'YES' : 'NO')
    if (!apiKey) {
      throw new Error('Anthropic API key not found in environment variables')
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    console.log('🚀 Server Action: Sending request to Claude claude-sonnet-4-20250514...')
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: 'You are a screenplay analyzer. Extract structured data from scripts and return valid JSON only.',
      messages: [
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

    console.log('🎯 Server Action: Claude request completed. Input tokens:', message.usage?.input_tokens || 'unknown')

    const textBlock = message.content.find(block => block.type === 'text')
    const responseContent = textBlock && 'text' in textBlock ? textBlock.text : '{}'
    console.log('📦 Server Action: Raw Claude response (first 200 chars):', responseContent.substring(0, 200))

    let result
    try {
      result = JSON.parse(responseContent)
      console.log('✅ Server Action: Successfully parsed JSON response')
    } catch (parseError) {
      console.error('❌ Server Action: Failed to parse Claude JSON response:', parseError)
      throw new Error('Invalid JSON response from Claude')
    }

    // Store sections
    console.log('💾 Server Action: Preparing to store sections in database...')
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

    console.log('💾 About to insert sections:', {
      sectionsCount: sections.length,
      sectionTypes: sections.map(s => s.section_type),
      sampleContent: sections[0] ? JSON.stringify(sections[0]).substring(0, 200) : 'none'
    })

    console.log('📤 Server Action: Inserting sections into database:', sections.length, 'sections')

    try {
      const { data, error: sectionsError } = await supabase
        .from('document_sections')
        .insert(sections)
        .select()

      if (sectionsError) {
        console.error('❌ Database insert error DETAILS:', {
          message: sectionsError.message,
          details: sectionsError.details,
          hint: sectionsError.hint,
          code: sectionsError.code,
          fullError: JSON.stringify(sectionsError, null, 2)
        })
        throw new Error(`Database error: ${sectionsError.message} (${sectionsError.code})`)
      }

      console.log('✅ Successfully inserted sections:', data?.length || 0, 'records')

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('❌ Exception during insert:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      throw new Error(`Insert failed: ${error.message}`)
    }

    console.log('✅ Server Action: Successfully saved sections to database')

    // Update status to COMPLETED
    console.log('🏁 Server Action: Updating document status to COMPLETED...')
    const finalStatusUpdate = await supabase
      .from('documents')
      .update({ processing_status: 'COMPLETED' as ProcessingStatus })
      .eq('id', documentId)

    if (finalStatusUpdate.error) {
      console.error('❌ Server Action: Failed to update final status:', finalStatusUpdate.error)
    } else {
      console.log('✅ Server Action: Successfully updated status to COMPLETED')
    }

    console.log('🔄 Server Action: Revalidating paths...')
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')

    console.log('🎉 Server Action: Process completed successfully!')
    return { success: true }
  } catch (error) {
    console.error('💥 Server Action: Caught error during processing:', error)

    // Update status to FAILED
    console.log('🚨 Server Action: Updating document status to FAILED...')
    const failedStatusUpdate = await supabase
      .from('documents')
      .update({ processing_status: 'FAILED' as ProcessingStatus })
      .eq('id', documentId)

    if (failedStatusUpdate.error) {
      console.error('❌ Server Action: Failed to update status to FAILED:', failedStatusUpdate.error)
    }

    const errorMessage = error instanceof Error ? error.message : 'Processing failed'
    console.error('❌ Server Action: Returning error:', errorMessage)
    return { error: errorMessage }
  }
}