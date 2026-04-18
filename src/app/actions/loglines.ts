'use server';

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Logline {
  type: 'hero' | 'conflict' | 'highConcept' | 'emotional' | 'genre';
  label: string;
  text: string;
  description: string;
}

interface Loglines {
  loglines: Logline[];
  generatedAt: string;
  scriptTitle: string;
}

export async function generateLoglines(documentId: string): Promise<{
  success: boolean;
  data?: Loglines;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Fetch document
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

    // 3. Check for existing loglines
    const { data: existing } = await supabase
      .from('script_analysis_outputs')
      .select('content')
      .eq('document_id', documentId)
      .eq('output_type', 'LOGLINES')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return {
        success: true,
        data: existing.content as Loglines,
      };
    }

    // 4. Set status to GENERATING
    await supabase
      .from('script_analysis_outputs')
      .insert({
        document_id: documentId,
        output_type: 'LOGLINES',
        status: 'GENERATING',
        content: {},
      });

    // 5. Prepare script (use first 20k characters for efficiency)
    const scriptText = document.extracted_text.slice(0, 20000);

    const prompt = `You are a professional script analyst and marketing expert. Create FIVE distinct logline variants for this screenplay, each approaching the story from a different angle.

Each logline should be 1-2 sentences (35-50 words maximum) and follow these specific approaches:

1. HERO-FOCUSED: Emphasize the protagonist, their identity, and their personal journey
   Example: "A disgraced detective must confront his past when..."

2. CONFLICT-FOCUSED: Highlight the central problem, obstacle, or challenge
   Example: "When a deadly virus threatens to destroy humanity..."

3. HIGH-CONCEPT: Lead with the unique premise, hook, or "what if" scenario
   Example: "In a world where memories can be stolen..."

4. EMOTIONAL: Emphasize the emotional stakes, relationships, and heart of the story
   Example: "A father's love is tested when he must choose between..."

5. GENRE-FORWARD: Lead with genre elements, tone, and style
   Example: "A pulse-pounding thriller where..."

Script Title: ${document.title}

Screenplay:
${scriptText}

CRITICAL REQUIREMENTS:
- Each logline must be 35-50 words
- Each must be compelling and unique
- Use active voice and present tense
- Include clear stakes
- Make them exciting and marketable

Return ONLY valid JSON with NO markdown formatting:
{
  "loglines": [
    {
      "type": "hero",
      "label": "Hero-Focused",
      "text": "Your hero-focused logline here",
      "description": "Brief note on why this angle works"
    },
    {
      "type": "conflict",
      "label": "Conflict-Focused",
      "text": "Your conflict-focused logline here",
      "description": "Brief note on why this angle works"
    },
    {
      "type": "highConcept",
      "label": "High-Concept",
      "text": "Your high-concept logline here",
      "description": "Brief note on why this angle works"
    },
    {
      "type": "emotional",
      "label": "Emotional",
      "text": "Your emotional logline here",
      "description": "Brief note on why this angle works"
    },
    {
      "type": "genre",
      "label": "Genre-Forward",
      "text": "Your genre-forward logline here",
      "description": "Brief note on why this angle works"
    }
  ],
  "scriptTitle": "${document.title}",
  "generatedAt": "${new Date().toISOString()}"
}`;

    // 6. Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'You are an expert at writing compelling loglines for film and TV. You understand marketing, story hooks, and what makes audiences interested. Always return valid JSON with no additional formatting.',
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

    // 7. Parse response
    let loglines: Loglines;
    try {
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      loglines = JSON.parse(cleanedContent);

      // Validate word counts (35-50 words per logline)
      loglines.loglines = loglines.loglines.map(logline => {
        const wordCount = logline.text.trim().split(/\s+/).length;
        if (wordCount > 60) {
          // If too long, truncate intelligently
          const words = logline.text.split(/\s+/);
          logline.text = words.slice(0, 50).join(' ') + '...';
        }
        return logline;
      });
    } catch {
      console.error('Failed to parse loglines response:', rawContent);
      throw new Error('Invalid JSON response from AI');
    }

    // 8. Store in database
    const processingTime = Date.now() - startTime;

    const { error: insertError } = await supabase
      .from('script_analysis_outputs')
      .upsert({
        document_id: documentId,
        output_type: 'LOGLINES',
        content: loglines,
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
      data: loglines,
    };

  } catch (error) {
    console.error('Loglines generation error:', error);

    // Update status to FAILED
    const supabase = await createClient();
    await supabase
      .from('script_analysis_outputs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('document_id', documentId)
      .eq('output_type', 'LOGLINES');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate loglines',
    };
  }
}

// Helper to fetch existing loglines
export async function getLoglines(documentId: string): Promise<{
  success: boolean;
  data?: Loglines;
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
      .eq('output_type', 'LOGLINES')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { success: false, error: 'Loglines not found' };
    }

    return {
      success: true,
      data: data.content as Loglines,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loglines',
    };
  }
}