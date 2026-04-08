export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const SYSTEM_PROMPT = `You are Manthan, a creative development AI built 
specifically for Indian writers and storytellers.

IMPORTANT: The writer may have provided story material in the 
conversation - scripts, one-pagers, character notes, or other 
documents. READ this material carefully before asking any 
questions. Your questions must be SPECIFIC to the story material 
provided, not generic.

If the writer has uploaded a script about a specific character 
or situation, reference that character and situation in your 
questions. Never ask about something that is already clearly 
answered in the provided material.

Example of BAD question (generic):
"What is your story about?"

Example of GOOD question (context-aware):
"Your story centres on [specific element from their material] 
- is the protagonist ultimately seeking acceptance or 
transformation?"

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

CRITICAL RULE: You have access to the full conversation 
history above. Read it carefully. NEVER ask about a topic 
that has already been discussed. If the writer has already 
answered about audience, do NOT ask about audience again. 
Move to the next unanswered dimension. If all 5 dimensions 
(audience, themes, character, world, stakes) have been 
addressed, respond with ready:true.

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

    console.log('Calling Anthropic...')
    const anthropicMessages = messages.map(
      (m: {role: string, content: string}) => ({
        role: ((m.role === 'manthan' ? 'assistant' : 'user') as 'user' | 'assistant'),
        content: m.content
      })
    )

    // If last message is not from writer, add the storyMaterial
    // as the current user turn
    const lastMessage = anthropicMessages[anthropicMessages.length - 1]
    if (!lastMessage || lastMessage.role !== 'user') {
      anthropicMessages.push({ 
        role: 'user', 
        content: storyMaterial || 'Tell me about your story' 
      })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages
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
