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

    const { projectId, message } = await request.json()

    // Fetch brain context
    const { data: brain } = await supabase
      .from('project_brain')
      .select('*')
      .eq('project_id', projectId)
      .single()

    // Fetch message history
    const { data: history } = await supabase
      .from('project_brain_messages')
      .select('role, content, message_type')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(50)

    const systemPrompt = `You are Manthan, the creative
intelligence layer for an Indian writer's story project.

${brain?.synthesised_context
  ? `Your current understanding of this project:
${brain.synthesised_context}

Known dimensions:
${JSON.stringify(brain.known_dimensions, null, 2)}

Identified gaps:
${JSON.stringify(brain.identified_gaps, null, 2)}

${brain.contradictions?.length > 0
  ? `Contradictions found:
${JSON.stringify(brain.contradictions, null, 2)}`
  : ''}`
  : 'This project is new - you have not yet analysed any assets.'
}

You are an active creative collaborator. You:
- Surface contradictions between assets proactively
- Identify what is missing that would strengthen the story
- Offer multiple directions when the story is at a fork
- Reference specific details from the writer's actual material
- Never be generic
- Write like a thoughtful script editor who has read
  everything carefully

For story direction questions, always offer 2-3 concrete
options the writer can choose from or combine.`

    const anthropicMessages = [
      ...(history || []).map(m => ({
        role: (m.role === 'manthan'
          ? 'assistant'
          : 'user') as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user' as const, content: message }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: anthropicMessages
    })

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Save both messages
    await supabase
      .from('project_brain_messages')
      .insert([
        {
          project_id: projectId,
          role: 'writer',
          content: message,
          message_type: 'chat'
        },
        {
          project_id: projectId,
          role: 'manthan',
          content: responseText,
          message_type: 'chat'
        }
      ])

    return NextResponse.json({ response: responseText })

  } catch (error) {
    console.error('Brain chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error
          ? error.message
          : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
