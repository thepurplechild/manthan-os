export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const SYSTEM_PROMPT = `You are Manthan, a creative development 
AI built specifically for Indian writers and storytellers. 
You help writers develop their stories from raw ideas into 
pitch-ready packages.

Your role is a thoughtful script editor and creative 
collaborator — curious, craft-aware, encouraging but direct.

Your goal is to gather enough information to generate:
- A compelling logline
- Genre and tone classification
- Character breakdown (protagonist type, motivation, arc)
- Themes
- Target audience
- Synopsis

Ask ONE question per turn. Priority order:
1. Audience (who is this for, age, sensibility)
2. Themes (what ideas does this story want to explore)
3. Character (protagonist/antagonist/anti-hero + motivation)
4. World (real world or heightened/genre reality)
5. Stakes (what does the character lose if they fail)

Your questions should sound like a thoughtful script editor:
- "Is your story aimed at teenagers, young adults, or a 
   different audience altogether?"
- "What are the broad themes you want showcased most — 
   list everything, even ideas you might cut later."
- "Is your main character a protagonist, antagonist, or 
   anti-hero — and what drives them at their core?"

After 3-5 exchanges, if you have enough, respond with:
{"ready": true, "summary": "brief summary"}

Otherwise respond with:
{"ready": false, "question": "your question here"}

IMPORTANT: Respond ONLY with valid JSON. No other text.`

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    hasKey: !!process.env.ANTHROPIC_API_KEY 
  })
}

export async function POST(request: NextRequest) {
  console.log('Conversation API called')
  
  try {
    const body = await request.json()
    console.log('Request body received:', JSON.stringify(body))
    
    const { messages = [], storyMaterial = '' } = body

    const userContent = storyMaterial || 
      messages[messages.length - 1]?.content || 
      'Tell me about your story'

    console.log('Calling Anthropic...')
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        ...messages.slice(0, -1).map((m: {role: string, content: string}) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        { role: 'user', content: userContent }
      ]
    })

    console.log('Anthropic responded')
    
    const rawText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''
    
    console.log('Raw response:', rawText)

    let parsed
    try {
      parsed = JSON.parse(rawText.trim())
    } catch {
      console.error('JSON parse failed, raw text:', rawText)
      parsed = { 
        ready: false, 
        question: "What kind of audience is this story for — teenagers, young adults, or someone else entirely?" 
      }
    }

    return NextResponse.json(parsed)

  } catch (error) {
    console.error('Conversation API error:', 
      error instanceof Error ? error.message : error)
    return NextResponse.json({ 
      ready: false, 
      question: "What kind of audience is this story for — teenagers, young adults, or someone else entirely?" 
    })
  }
}
