'use server';

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Synopsis {
  tweet: string;        // Max 280 characters
  short: string;        // ~150 words, 1 paragraph
  long: string;         // ~500 words, 3-5 paragraphs
  generatedAt: string;
  scriptTitle: string;
}

export async function generateSynopsis(documentId: string): Promise<{
  success: boolean;
  data?: Synopsis;
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

    // 3. Check for existing synopsis
    const { data: existing } = await supabase
      .from('script_analysis_outputs')
      .select('content')
      .eq('document_id', documentId)
      .eq('output_type', 'SYNOPSIS')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return {
        success: true,
        data: existing.content as Synopsis,
      };
    }

    // 4. Set status to GENERATING
    await supabase
      .from('script_analysis_outputs')
      .insert({
        document_id: documentId,
        output_type: 'SYNOPSIS',
        status: 'GENERATING',
        content: {},
      });

    // 5. Prepare script (use first 25k characters)
    const scriptText = document.extracted_text.slice(0, 25000);

    const prompt = `You are a professional script analyst and marketing copywriter. Create THREE versions of a compelling synopsis for this screenplay:

1. TWEET (280 characters MAXIMUM):
   - A punchy hook that makes people want to know more
   - Focus on the most unique/compelling element
   - Include emotional stakes or conflict
   - Must be EXACTLY at or under 280 characters

2. SHORT (approximately 150 words, 1 paragraph):
   - Setup: Who is the protagonist and what's their world?
   - Conflict: What problem/challenge disrupts their life?
   - Stakes: What will happen if they fail?
   - Write in present tense, active voice
   - Make it compelling for email pitches or quick reads
   - Aim for 130-170 words

3. LONG (approximately 500 words, 3-5 paragraphs):
   - Detailed plot overview covering all major acts
   - Character introductions and arcs
   - Key plot twists (without spoiling the climax)
   - Thematic elements
   - Emotional journey
   - Genre and tone
   - Write professionally for pitch decks and detailed proposals
   - Aim for 450-550 words

Script Title: ${document.title}

Screenplay:
${scriptText}

CRITICAL: Return ONLY valid JSON with NO markdown formatting or code blocks:
{
  "tweet": "Your 280-char hook here",
  "short": "Your 150-word paragraph here",
  "long": "Your 500-word detailed synopsis here",
  "scriptTitle": "${document.title}",
  "generatedAt": "${new Date().toISOString()}"
}`;

    // 6. Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are an expert at writing compelling synopses for film and TV scripts. You understand story structure, marketing, and how to hook readers. Always return valid JSON with no additional formatting.',
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
    let synopsis: Synopsis;
    try {
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      synopsis = JSON.parse(cleanedContent);

      // Validate and trim tweet if needed
      if (synopsis.tweet.length > 280) {
        synopsis.tweet = synopsis.tweet.slice(0, 277) + '...';
      }
    } catch {
      console.error('Failed to parse synopsis response:', rawContent);
      throw new Error('Invalid JSON response from AI');
    }

    // 8. Store in database
    const processingTime = Date.now() - startTime;

    const { error: insertError } = await supabase
      .from('script_analysis_outputs')
      .upsert({
        document_id: documentId,
        output_type: 'SYNOPSIS',
        content: synopsis,
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
      data: synopsis,
    };

  } catch (error) {
    console.error('Synopsis generation error:', error);

    // Update status to FAILED
    const supabase = await createClient();
    await supabase
      .from('script_analysis_outputs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('document_id', documentId)
      .eq('output_type', 'SYNOPSIS');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate synopsis',
    };
  }
}

// Helper to fetch existing synopsis
export async function getSynopsis(documentId: string): Promise<{
  success: boolean;
  data?: Synopsis;
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
      .eq('output_type', 'SYNOPSIS')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { success: false, error: 'Synopsis not found' };
    }

    return {
      success: true,
      data: data.content as Synopsis,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch synopsis',
    };
  }
}