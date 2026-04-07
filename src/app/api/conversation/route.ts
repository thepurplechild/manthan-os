import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

type ConversationMessage = {
  role: 'writer' | 'manthan'
  content: string
}

const SYSTEM_PROMPT_TEMPLATE = `
You are Manthan, a creative development AI built specifically
for Indian writers and storytellers. You help writers develop
their stories from raw ideas into pitch-ready packages.

Your role is a thoughtful script editor and creative
collaborator - curious, craft-aware, encouraging but direct.

You are conducting a creative development conversation.
Your goal is to gather enough information to generate:
- A compelling logline
- Genre and tone classification
- Character breakdown (protagonist type, motivation, arc)
- Themes
- Target audience
- Synopsis

Current conversation and story material:
{conversation_history}

What you already know about this story:
{known_dimensions}

What is still unclear or missing:
{missing_dimensions}

Ask ONE question that would most improve the story package
you can generate. Priority order:
1. Audience (who is this for, age, sensibility)
2. Themes (what ideas does this story want to explore)
3. Character (protagonist/antagonist/anti-hero + motivation)
4. World (real world or heightened/genre reality)
5. Stakes (what does the character lose if they fail)

Your questions should sound like a thoughtful script editor,
not a form. Examples of good question style:
- "Is your story aimed at teenagers, young adults, or a
   different audience altogether? Give as much detail as you can."
- "What are the broad themes you want showcased most -
   list everything, even ideas you might cut later."
- "Is your main character a protagonist, antagonist, or
   anti-hero - and what drives them at their core?"
- "What is the moment that breaks your character's
   ordinary world and sets everything in motion?"
- "Does this story live in the recognisable world,
   or does it bend reality in some way?"

After 3-5 exchanges, if you have enough to generate outputs,
respond with exactly this JSON:
{"ready": true, "summary": "brief summary of what you know"}

Otherwise respond with exactly this JSON:
{"ready": false, "question": "your question text here"}

Respond ONLY with JSON. No other text.
`.trim()

const SAFE_FALLBACK_QUESTION =
  'Tell me more about the central character in your story — are they a protagonist, an antagonist, or an anti-hero, and what drives them?'

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response')
  }
  return raw.slice(start, end + 1)
}

function deriveMissingDimensions(knownDimensions: Record<string, unknown>) {
  const required = ['audience', 'themes', 'character', 'world', 'stakes']
  return required.filter((key) => {
    const value = knownDimensions[key]
    if (typeof value === 'string') return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    return !value
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messages?: ConversationMessage[]
      storyMaterial?: string
      knownDimensions?: Record<string, unknown>
    }

    const messages = body.messages || []
    const storyMaterial = body.storyMaterial || ''
    const knownDimensions = body.knownDimensions || {}

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('conversation api: missing ANTHROPIC_API_KEY')
      return NextResponse.json(
        {
          ready: false,
          question: SAFE_FALLBACK_QUESTION,
          error: 'ANTHROPIC_API_KEY is missing on server environment',
        },
        { status: 500 }
      )
    }

    const missingDimensions = deriveMissingDimensions(knownDimensions)
    const prompt = SYSTEM_PROMPT_TEMPLATE
      .replace('{conversation_history}', JSON.stringify({ conversationHistory: messages, storyMaterial }, null, 2))
      .replace('{known_dimensions}', JSON.stringify(knownDimensions, null, 2))
      .replace('{missing_dimensions}', JSON.stringify(missingDimensions, null, 2))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const rawResponseText = await response.text()
    console.log('conversation api raw Anthropic response:', rawResponseText)

    if (!response.ok) {
      let upstreamErrorMessage = 'Conversation model request failed'
      try {
        const parsed = JSON.parse(rawResponseText) as { error?: { message?: string } }
        upstreamErrorMessage = parsed.error?.message || upstreamErrorMessage
      } catch {
        upstreamErrorMessage = rawResponseText || upstreamErrorMessage
      }
      console.error('conversation api non-200 response:', {
        status: response.status,
        statusText: response.statusText,
        body: rawResponseText,
      })
      return NextResponse.json(
        {
          ready: false,
          question: SAFE_FALLBACK_QUESTION,
          error: upstreamErrorMessage,
        },
        { status: 502 }
      )
    }

    let data: { content?: Array<{ type?: string; text?: string }> }
    try {
      data = JSON.parse(rawResponseText) as { content?: Array<{ type?: string; text?: string }> }
    } catch (parseError) {
      console.error('conversation api failed parsing Anthropic JSON payload:', {
        parseError,
        rawResponseText,
      })
      return NextResponse.json(
        {
          ready: false,
          question: SAFE_FALLBACK_QUESTION,
          error: 'Anthropic response was not valid JSON',
        },
        { status: 502 }
      )
    }

    const rawText = (data.content || [])
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text as string)
      .join('\n')
      .trim()

    if (!rawText) {
      return NextResponse.json(
        {
          ready: false,
          question: SAFE_FALLBACK_QUESTION,
          error: 'Anthropic response text was empty',
        },
        { status: 502 }
      )
    }

    try {
      const parsed = JSON.parse(extractJsonObject(rawText)) as {
        ready?: boolean
        question?: string
        summary?: string
      }
      if (typeof parsed.ready !== 'boolean') {
        throw new Error('Invalid response format')
      }
      if (parsed.ready) {
        return NextResponse.json({ ready: true, summary: parsed.summary || 'Story context is sufficient for generation.' })
      }
      return NextResponse.json({ ready: false, question: parsed.question || SAFE_FALLBACK_QUESTION })
    } catch (parseError) {
      console.error('conversation api response JSON parse failed:', {
        parseError,
        rawText,
      })
      return NextResponse.json(
        {
          ready: false,
          question: SAFE_FALLBACK_QUESTION,
          error: 'Model output was not valid JSON for conversation schema',
        },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('conversation api unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json(
      {
        ready: false,
        question: SAFE_FALLBACK_QUESTION,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
