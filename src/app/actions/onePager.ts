'use server';

import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { getCharacterBible } from './characterBible';
import { getSynopsis } from './synopsis';
import { getLoglines } from './loglines';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OnePager {
  logline: string;
  synopsis: string;
  keyCharacters: Array<{
    name: string;
    role: string;
    description: string;
  }>;
  genreAndTone: {
    primaryGenre: string;
    subGenres: string[];
    tone: string[];
  };
  comparableFilms: Array<{
    title: string;
    reason: string;
  }>;
  visualStyle: {
    cinematography: string;
    colorPalette: string[];
    mood: string;
  };
  targetAudience: {
    demographics: string;
    psychographics: string;
  };
  productionNotes: {
    budgetTier: string;
    locationCount: number;
    specialRequirements: string[];
  };
  generatedAt: string;
  scriptTitle: string;
}

export async function generateOnePager(documentId: string): Promise<{
  success: boolean;
  data?: OnePager;
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

    // 2. Check for existing one-pager
    const { data: existing } = await supabase
      .from('script_analysis_outputs')
      .select('content')
      .eq('document_id', documentId)
      .eq('output_type', 'ONE_PAGER')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return {
        success: true,
        data: existing.content as OnePager,
      };
    }

    // 3. Fetch all prerequisite analyses
    const characterBibleResult = await getCharacterBible(documentId);
    const synopsisResult = await getSynopsis(documentId);
    const loglinesResult = await getLoglines(documentId);

    // Check if all prerequisites exist
    if (!characterBibleResult.success || !synopsisResult.success || !loglinesResult.success) {
      return {
        success: false,
        error: 'Please generate Character Bible, Synopsis, and Loglines first before creating a One-Pager.',
      };
    }

    // 4. Set status to GENERATING
    await supabase
      .from('script_analysis_outputs')
      .insert({
        document_id: documentId,
        output_type: 'ONE_PAGER',
        status: 'GENERATING',
        content: {},
      });

    // 5. Prepare context from existing analyses
    const context = {
      title: characterBibleResult.data!.scriptTitle,
      characters: characterBibleResult.data!.characters.slice(0, 3), // Top 3 characters
      synopsis: synopsisResult.data!.short,
      logline: loglinesResult.data!.loglines[0].text, // Use first logline
    };

    const prompt = `You are a professional pitch deck creator for film and TV. Create a comprehensive ONE-PAGER pitch document using the provided script analysis.

Context from existing analysis:
- Title: ${context.title}
- Logline: ${context.logline}
- Synopsis: ${context.synopsis}
- Key Characters: ${JSON.stringify(context.characters.map(c => ({ name: c.name, role: c.role })))}

Generate a complete one-pager with these sections:

1. BEST LOGLINE: Choose or refine the provided logline (1-2 sentences)

2. SYNOPSIS: Use the provided synopsis (keep it concise)

3. KEY CHARACTERS: List 3 main characters with name, role, and 1-sentence description

4. GENRE AND TONE:
   - Primary genre
   - 2-3 sub-genres
   - 3-4 tone descriptors (dark, comedic, gritty, etc.)

5. COMPARABLE FILMS: 3 successful films/shows with brief explanation why they're similar
   Format: "Film Title (Year) - Reason for comparison"

6. VISUAL STYLE:
   - Cinematography style description
   - Color palette (5 specific colors with descriptions)
   - Overall mood/aesthetic

7. TARGET AUDIENCE:
   - Demographics (age, gender, etc.)
   - Psychographics (interests, values, behaviors)

8. PRODUCTION NOTES:
   - Budget tier (Micro: <$1M, Low: $1M-$5M, Medium: $5M-$20M, High: $20M+)
   - Estimated number of locations
   - Special requirements (VFX, stunts, period setting, etc.)

Return ONLY valid JSON with NO markdown:
{
  "logline": "string",
  "synopsis": "string",
  "keyCharacters": [
    { "name": "string", "role": "string", "description": "string" }
  ],
  "genreAndTone": {
    "primaryGenre": "string",
    "subGenres": ["string"],
    "tone": ["string"]
  },
  "comparableFilms": [
    { "title": "string", "reason": "string" }
  ],
  "visualStyle": {
    "cinematography": "string",
    "colorPalette": ["color1", "color2", "color3", "color4", "color5"],
    "mood": "string"
  },
  "targetAudience": {
    "demographics": "string",
    "psychographics": "string"
  },
  "productionNotes": {
    "budgetTier": "string",
    "locationCount": number,
    "specialRequirements": ["string"]
  },
  "scriptTitle": "${context.title}",
  "generatedAt": "${new Date().toISOString()}"
}`;

    // 6. Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating professional pitch documents for film and TV. You understand industry standards, marketing, and what executives want to see. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const rawContent = response.choices[0].message.content;
    if (!rawContent) {
      throw new Error('Empty response from OpenAI');
    }

    // 7. Parse response
    let onePager: OnePager;
    try {
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      onePager = JSON.parse(cleanedContent);
    } catch {
      console.error('Failed to parse one-pager response:', rawContent);
      throw new Error('Invalid JSON response from AI');
    }

    // 8. Store in database
    const processingTime = Date.now() - startTime;

    const { error: insertError } = await supabase
      .from('script_analysis_outputs')
      .upsert({
        document_id: documentId,
        output_type: 'ONE_PAGER',
        content: onePager,
        status: 'GENERATED',
        processing_time_ms: processingTime,
        ai_model: 'gpt-4o-mini',
      }, {
        onConflict: 'document_id,output_type,version'
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    return {
      success: true,
      data: onePager,
    };

  } catch (error) {
    console.error('One-pager generation error:', error);

    // Update status to FAILED
    const supabase = await createClient();
    await supabase
      .from('script_analysis_outputs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('document_id', documentId)
      .eq('output_type', 'ONE_PAGER');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate one-pager',
    };
  }
}

// Helper to fetch existing one-pager
export async function getOnePager(documentId: string): Promise<{
  success: boolean;
  data?: OnePager;
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
      .eq('output_type', 'ONE_PAGER')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { success: false, error: 'One-pager not found' };
    }

    return {
      success: true,
      data: data.content as OnePager,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch one-pager',
    };
  }
}