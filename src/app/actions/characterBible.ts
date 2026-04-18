'use server';

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  physicalDescription: string;
  personality: string[];
  backstory: string;
  motivations: string;
  arc: string;
  relationships: Record<string, string>;
  keyDialogue: string[];
  castingSuggestions: string[];
}

interface CharacterBible {
  characters: Character[];
  generatedAt: string;
  scriptTitle: string;
}

export async function generateCharacterBible(documentId: string): Promise<{
  success: boolean;
  data?: CharacterBible;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // 1. Verify user owns this document
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Fetch document with extracted text
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, extracted_text, owner_id')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single();

    if (docError || !document) {
      return { success: false, error: 'Document not found' };
    }

    if (!document.extracted_text) {
      return { success: false, error: 'No extracted text available. Please process the document first.' };
    }

    // 3. Check if Character Bible already exists
    const { data: existing } = await supabase
      .from('script_analysis_outputs')
      .select('content')
      .eq('document_id', documentId)
      .eq('output_type', 'CHARACTER_BIBLE')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return {
        success: true,
        data: existing.content as CharacterBible,
      };
    }

    // 4. Set status to GENERATING
    await supabase
      .from('script_analysis_outputs')
      .insert({
        document_id: documentId,
        output_type: 'CHARACTER_BIBLE',
        status: 'GENERATING',
        content: {},
      });

    // 5. Prepare prompt for Claude
    const scriptText = document.extracted_text.slice(0, 30000); // Limit to ~30k chars

    const prompt = `You are a professional script analyst. Analyze this screenplay and create a comprehensive Character Bible.

For each significant character (protagonist, antagonist, and major supporting characters), provide:

1. Name and Role (protagonist, antagonist, supporting, or minor)
2. Physical Description (age, appearance, distinctive features)
3. Personality Traits (3-5 core traits with brief examples)
4. Background/Backstory (what we know about their past)
5. Motivations & Goals (what drives them throughout the story)
6. Character Arc (how they change from beginning to end)
7. Relationships (with other major characters)
8. Key Dialogue (2-3 memorable lines they speak)
9. Casting Suggestions (2-3 actor types or reference actors)

Focus on characters who significantly impact the plot. Include at least the protagonist and antagonist, and up to 5-8 total characters.

Script Title: ${document.title}

Screenplay:
${scriptText}

CRITICAL: Return ONLY a valid JSON object with NO additional text, markdown formatting, or code blocks. Use this exact structure:
{
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist",
      "physicalDescription": "Detailed physical description",
      "personality": ["trait1", "trait2", "trait3"],
      "backstory": "Background information",
      "motivations": "What drives them",
      "arc": "How they change",
      "relationships": {
        "Character2": "Description of relationship",
        "Character3": "Description of relationship"
      },
      "keyDialogue": ["Quote 1", "Quote 2"],
      "castingSuggestions": ["Actor type 1", "Actor type 2"]
    }
  ],
  "scriptTitle": "${document.title}",
  "generatedAt": "${new Date().toISOString()}"
}`;

    // 6. Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are a professional Hollywood script analyst specializing in character development. Always return valid JSON with no additional formatting.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    const rawContent = textBlock && 'text' in textBlock ? textBlock.text : null;
    if (!rawContent) {
      throw new Error('Empty response from Claude');
    }

    // 7. Parse response (handle potential markdown wrapping)
    let characterBible: CharacterBible;
    try {
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      characterBible = JSON.parse(cleanedContent);
    } catch {
      console.error('Failed to parse Claude response:', rawContent);
      throw new Error('Invalid JSON response from AI');
    }

    // 8. Store in database
    const processingTime = Date.now() - startTime;

    const { error: insertError } = await supabase
      .from('script_analysis_outputs')
      .upsert({
        document_id: documentId,
        output_type: 'CHARACTER_BIBLE',
        content: characterBible,
        status: 'GENERATED',
        processing_time_ms: processingTime,
        ai_model: 'claude-sonnet-4-20250514',
      }, {
        onConflict: 'document_id,output_type,version'
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    return {
      success: true,
      data: characterBible,
    };

  } catch (error) {
    console.error('Character Bible generation error:', error);

    // Update status to FAILED
    const supabase = await createClient();
    await supabase
      .from('script_analysis_outputs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('document_id', documentId)
      .eq('output_type', 'CHARACTER_BIBLE');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate Character Bible',
    };
  }
}

// Helper function to fetch existing Character Bible
export async function getCharacterBible(documentId: string): Promise<{
  success: boolean;
  data?: CharacterBible;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('script_analysis_outputs')
      .select('content, status')
      .eq('document_id', documentId)
      .eq('output_type', 'CHARACTER_BIBLE')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { success: false, error: 'Character Bible not found' };
    }

    return {
      success: true,
      data: data.content as CharacterBible,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Character Bible',
    };
  }
}