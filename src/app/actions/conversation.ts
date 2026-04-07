'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'

export type ConversationRole = 'writer' | 'manthan'

export interface Message {
  role: ConversationRole
  content: string
}

export interface GeneratedOutputs {
  logline?: string
  genreTone?: {
    primaryGenre?: string
    subGenres?: string[]
    tone?: string[]
  }
  characterBreakdown?: Json
  synopsis?: string
  onePager?: Json
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

export async function createConversationTurn(
  conversationHistory: Message[],
  storyMaterial: string,
  knownDimensions: Record<string, unknown>
): Promise<{ ready: boolean; question?: string; summary?: string }> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    const missingDimensions = deriveMissingDimensions(knownDimensions)
    const prompt = SYSTEM_PROMPT_TEMPLATE
      .replace('{conversation_history}', JSON.stringify({ conversationHistory, storyMaterial }, null, 2))
      .replace('{known_dimensions}', JSON.stringify(knownDimensions, null, 2))
      .replace('{missing_dimensions}', JSON.stringify(missingDimensions, null, 2))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown Anthropic error')
      throw new Error(`Conversation model request failed: ${errorText}`)
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
    }

    const rawText = (data.content || [])
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text as string)
      .join('\n')
      .trim()

    if (!rawText) {
      throw new Error('Conversation model returned empty response')
    }

    const parsed = JSON.parse(extractJsonObject(rawText)) as {
      ready?: boolean
      question?: string
      summary?: string
    }

    if (typeof parsed.ready !== 'boolean') {
      throw new Error('Invalid conversation model response format')
    }

    if (parsed.ready) {
      return {
        ready: true,
        summary: parsed.summary || 'Story context is sufficient for generation.',
      }
    }

    return {
      ready: false,
      question: parsed.question || 'What audience are you writing this for, and why that audience?',
    }
  } catch (error) {
    console.error('createConversationTurn error:', error)
    return {
      ready: false,
      question:
        'Let us anchor the story first. Who is this story for, and what emotion should they leave with?',
    }
  }
}

export async function saveStoryProject(
  title: string,
  conversationHistory: Message[],
  outputs: GeneratedOutputs,
  uploadedFileIds: string[]
): Promise<{ projectId: string; documentId: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const cleanTitle = title.trim() || 'Untitled Story'
  const conversationText = conversationHistory
    .map((msg) => `${msg.role === 'writer' ? 'Writer' : 'Manthan'}: ${msg.content}`)
    .join('\n\n')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title: cleanTitle,
      description: 'Generated from Manthan conversation engine',
      asset_counts: {},
      total_size_bytes: conversationText.length,
      is_public: false,
    })
    .select('id')
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || 'Failed to create project')
  }

  const storagePath = `${user.id}/conversation/${Date.now()}-story.txt`
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id,
      project_id: project.id,
      title: cleanTitle,
      asset_type: 'SCRIPT',
      storage_url: `conversation://${storagePath}`,
      storage_path: storagePath,
      mime_type: 'text/plain',
      file_size_bytes: conversationText.length,
      processing_status: 'COMPLETED',
      extracted_text: conversationText,
      is_primary: true,
    })
    .select('id')
    .single()

  if (documentError || !document) {
    throw new Error(documentError?.message || 'Failed to create document')
  }

  const outputRows = [
    outputs.logline
      ? {
          document_id: document.id,
          output_type: 'LOGLINES',
          content: { loglines: [{ type: 'hero', label: 'Primary', text: outputs.logline, description: '' }] },
          status: 'GENERATED',
          ai_model: 'claude-sonnet-4-20250514',
        }
      : null,
    outputs.synopsis
      ? {
          document_id: document.id,
          output_type: 'SYNOPSIS',
          content: {
            tweet: outputs.synopsis.slice(0, 280),
            short: outputs.synopsis,
            long: outputs.synopsis,
            generatedAt: new Date().toISOString(),
            scriptTitle: cleanTitle,
          },
          status: 'GENERATED',
          ai_model: 'claude-sonnet-4-20250514',
        }
      : null,
    outputs.characterBreakdown
      ? {
          document_id: document.id,
          output_type: 'CHARACTER_BIBLE',
          content: outputs.characterBreakdown,
          status: 'GENERATED',
          ai_model: 'claude-sonnet-4-20250514',
        }
      : null,
    outputs.onePager
      ? {
          document_id: document.id,
          output_type: 'ONE_PAGER',
          content: outputs.onePager,
          status: 'GENERATED',
          ai_model: 'claude-sonnet-4-20250514',
        }
      : null,
    outputs.genreTone
      ? {
          document_id: document.id,
          output_type: 'GENRE_CLASSIFICATION',
          content: outputs.genreTone,
          status: 'GENERATED',
          ai_model: 'claude-sonnet-4-20250514',
        }
      : null,
  ].filter(Boolean)

  if (outputRows.length > 0) {
    const { error: outputsError } = await supabase.from('script_analysis_outputs').insert(outputRows)
    if (outputsError) {
      throw new Error(outputsError.message || 'Failed to save generated outputs')
    }
  }

  if (uploadedFileIds.length > 0) {
    await supabase
      .from('documents')
      .update({
        project_id: project.id,
        parent_document_id: document.id,
        is_primary: false,
      })
      .in('id', uploadedFileIds)
      .eq('owner_id', user.id)
  }

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${project.id}`)

  return {
    projectId: project.id,
    documentId: document.id,
  }
}
