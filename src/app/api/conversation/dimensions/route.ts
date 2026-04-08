export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === 'writer' ? 'Writer' : 'Manthan'}: ${m.content}`
      )
      .join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `You analyse a story development conversation
and determine which of 5 dimensions are now known.

The 5 dimensions are:
1. audience — who this story is for (age, sensibility,
   geography, culture — could be "teenagers in Bhubaneswar",
   "urban Parsi families", "everyone", anything specific)
2. themes — what ideas the story explores (love, class,
   identity, faith, anything the writer has mentioned)
3. character — who the story is about and what drives them
4. world — where and when the story is set (any specific
   place, time period, social context)
5. stakes — what the protagonist stands to lose or gain

A dimension is "known" if the writer has provided ANY
information about it — even partial, even indirect.
Do not require complete answers. A hint counts.

Examples of what counts as "known":
- audience: "teenagers" / "my mom would love this" /
  "OTT platform" / "for people who grew up in small towns"
- themes: "it's about finding yourself" / "family pressure" /
  "I want to show how class works in India"
- character: "a young woman" / "he's running from something" /
  "the protagonist is an anti-hero"
- world: "1960s Bhubaneswar" / "present day Mumbai" /
  "a small fishing village" / "during partition"
- stakes: "she could lose her family" / "his whole identity
  is at risk" / "if he fails, everything he built collapses"

Respond ONLY with a JSON object:
{
  "audience": true or false,
  "themes": true or false,
  "character": true or false,
  "world": true or false,
  "stakes": true or false
}`,
      messages: [{
        role: 'user',
        content: `Conversation so far:
${conversationText}

Which dimensions are now known?`
      }]
    })

    const rawText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '{}'

    try {
      const dimensions = JSON.parse(rawText)
      return NextResponse.json(dimensions)
    } catch {
      return NextResponse.json({
        audience: false,
        themes: false,
        character: false,
        world: false,
        stakes: false
      })
    }
  } catch (error) {
    console.error('Dimensions inference error:', error)
    return NextResponse.json({
      audience: false,
      themes: false,
      character: false,
      world: false,
      stakes: false
    })
  }
}
