export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(
      { error: 'Unauthorized' }, { status: 401 }
    )

    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json(
      { error: 'projectId required' }, { status: 400 }
    )

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, title, description')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single()

    if (!project) return NextResponse.json(
      { error: 'Project not found' }, { status: 404 }
    )

    const { data: projectDocuments } = await supabase
      .from('documents')
      .select('id, title, asset_type, extracted_text, mime_type, processing_status')
      .eq('project_id', projectId)
      .not('extracted_text', 'is', null)
      .in('processing_status', ['COMPLETED', 'READY'])

    console.log('Project documents found:',
      projectDocuments?.length,
      projectDocuments?.map(d => ({
        title: d.title,
        textLength: d.extracted_text?.length,
        status: d.processing_status
      }))
    )

    if (!projectDocuments || projectDocuments.length === 0) {
      return NextResponse.json({
        brain: null,
        message: 'No extracted content found for this project'
      })
    }

    const assetTexts = projectDocuments
      .map(d => `[${d.asset_type || 'DOCUMENT'}: ${d.title}]
${d.extracted_text}`)
      .join('\n\n---\n\n')

    // Generate asset hash to detect changes
    const assetHash = projectDocuments
      .map(d => d.id)
      .sort()
      .join(',')

    // Call Claude to synthesise all assets
    const synthesisResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are Manthan, the creative intelligence
layer for an Indian writer's story project. You have been
given all the assets in a writer's project to analyse.

Your task is to synthesise these into a unified
understanding and identify insights.

Respond ONLY with a valid JSON object in this exact shape:
{
  "story_summary": "2-3 sentence summary of what this
    story is about based on all assets",
  "known_dimensions": {
    "audience": "who this is for, or empty string",
    "themes": "core themes identified, or empty string",
    "character": "protagonist and key characters,
      or empty string",
    "world": "setting and world, or empty string",
    "stakes": "what is at stake, or empty string"
  },
  "identified_gaps": [
    "specific thing missing that would strengthen the story"
  ],
  "contradictions": [
    {
      "title": "short label for this contradiction",
      "description": "what conflicts with what,
        specifically referencing the assets",
      "asset_titles": ["asset1", "asset2"]
    }
  ],
  "synthesised_context": "A rich 3-4 paragraph prose
    description of this story as you understand it,
    synthesising ALL assets. This will be used as
    context for all future AI operations on this project.",
  "suggestions": [
    {
      "type": "direction|contradiction|gap|enhancement|
        character|structure",
      "title": "short title for this suggestion",
      "body": "detailed observation and suggestion,
        grounded in the specific material",
      "options": [
        "Option A: ...",
        "Option B: ...",
        "Option C: ..."
      ]
    }
  ]
}`,
      messages: [{
        role: 'user',
        content: `Project: ${project.title}

Assets:
${assetTexts}

Analyse all assets and return your synthesis as JSON.`
      }]
    })

    const rawText = synthesisResponse.content[0].type === 'text'
      ? synthesisResponse.content[0].text
      : ''

    let synthesis
    try {
      synthesis = JSON.parse(rawText.trim())
    } catch {
      console.error('Brain synthesis parse failed:', rawText)
      return NextResponse.json(
        { error: 'Failed to parse synthesis' },
        { status: 500 }
      )
    }

    console.log('Synthesis result:',
      JSON.stringify(synthesis, null, 2).slice(0, 500)
    )

    // Upsert project_brain
    const { data: brain, error: brainError } = await supabase
      .from('project_brain')
      .upsert({
        project_id: projectId,
        story_summary: synthesis.story_summary,
        known_dimensions: synthesis.known_dimensions,
        identified_gaps: synthesis.identified_gaps,
        contradictions: synthesis.contradictions,
        synthesised_context: synthesis.synthesised_context,
        asset_hash: assetHash,
        last_analysed_at: new Date().toISOString()
      }, { onConflict: 'project_id' })
      .select()
      .single()

    console.log('Brain upsert result:',
      brainError ? brainError.message : 'success'
    )

    if (brainError) {
      console.error('Brain upsert error:', brainError)
      return NextResponse.json(
        { error: brainError.message },
        { status: 500 }
      )
    }

    // Save suggestions
    if (synthesis.suggestions?.length > 0) {
      // Dismiss old active suggestions
      await supabase
        .from('project_suggestions')
        .update({ status: 'dismissed' })
        .eq('project_id', projectId)
        .eq('status', 'active')

      // Insert new suggestions
      await supabase
        .from('project_suggestions')
        .insert(
          synthesis.suggestions.map((s: {
            type: string
            title: string
            body: string
            options?: string[]
          }) => ({
            project_id: projectId,
            suggestion_type: s.type,
            title: s.title,
            body: s.body,
            options: s.options || [],
            status: 'active'
          }))
        )
    }

    const { data: primaryDoc } = await supabase
      .from('documents')
      .select('id, extracted_text')
      .eq('owner_id', user.id)
      .eq('project_id', projectId)
      .eq('is_primary', true)
      .not('extracted_text', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (primaryDoc) {
      await supabase
        .from('documents')
        .update({
          extracted_text: synthesis.synthesised_context
        })
        .eq('id', primaryDoc.id)

      await supabase
        .from('script_analysis_outputs')
        .delete()
        .eq('document_id', primaryDoc.id)
    }

    return NextResponse.json({
      brain,
      suggestions: synthesis.suggestions,
      primaryDocumentId: primaryDoc?.id
    })

  } catch (error) {
    console.error('Brain analyse error:', error)
    return NextResponse.json(
      { error: error instanceof Error
          ? error.message
          : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
