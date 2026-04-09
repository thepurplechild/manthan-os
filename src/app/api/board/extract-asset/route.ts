export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { documentId } = await request.json()

    const { data: doc } = await supabase
      .from('documents')
      .select('id, title, extracted_text, mime_type, asset_type, processing_status')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc?.extracted_text) {
      return NextResponse.json({
        extraction: null,
        message: 'No extracted text yet',
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are Manthan, analysing a creative asset uploaded by an Indian writer or filmmaker.

Extract structured story information from this asset.
Be specific and grounded in what is actually in the material.
Do not invent — only extract what is clearly present.

Respond ONLY with valid JSON, no markdown fences:
{
  "characters": [
    {
      "name": "character name",
      "role": "protagonist|antagonist|supporting|minor",
      "description": "one sentence description",
      "want": "what they want externally if apparent",
      "wound": "backstory or wound if apparent"
    }
  ],
  "themes": ["theme as a phrase, not a single word"],
  "world": {
    "location": "specific place if mentioned",
    "period": "time period if mentioned",
    "social_context": "social/cultural context if apparent"
  },
  "story_beats": [
    "key narrative moment or event"
  ],
  "tone": "emotional register and style in a phrase",
  "asset_summary": "2-3 sentence summary of this asset's contribution to the story",
  "gaps": [
    "something important that seems missing from this asset"
  ]
}`,
      messages: [
        {
          role: 'user',
          content: `Asset: ${doc.title}\nType: ${doc.asset_type}\n\nContent:\n${doc.extracted_text.slice(0, 8000)}`,
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'

    let extraction
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      extraction = JSON.parse(cleaned)
    } catch {
      console.error('Extract asset parse failed:', rawText)
      extraction = null
    }

    if (extraction) {
      await supabase.from('documents').update({ asset_metadata: extraction }).eq('id', documentId)
    }

    return NextResponse.json({ extraction })
  } catch (error) {
    console.error('Extract asset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
