'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create service role client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface CharacterPrompt {
  characterName: string;
  prompt: string;
  castingSuggestions: string[];
  role: string;
}

interface Character {
  name: string;
  role: string;
  physicalDescription?: string;
  personality?: string[];
  castingSuggestions?: string[];
}

export interface LocationPrompt {
  locationName: string;
  prompt: string;
  description: string;
}

export interface VisualPromptsResult {
  success: boolean;
  characterPrompts?: CharacterPrompt[];
  locationPrompts?: LocationPrompt[];
  error?: string;
}

/**
 * Extract optimized character prompts from CHARACTER_BIBLE data
 */
export async function extractCharacterPrompts(documentId: string): Promise<VisualPromptsResult> {
  try {
    console.log('[ExtractPrompts] Extracting character prompts for document:', documentId);

    const supabase = supabaseAdmin;

    // Get CHARACTER_BIBLE and ONE_PAGER for visual style context
    console.log('[ExtractPrompts] Querying database for document:', documentId);
    const { data: analyses, error } = await supabase
      .from('script_analysis_outputs')
      .select('output_type, content')
      .eq('document_id', documentId)
      .in('output_type', ['CHARACTER_BIBLE', 'ONE_PAGER']);

    console.log('[ExtractPrompts] Database response:', { data: analyses?.length, error });

    if (error) {
      console.error('[ExtractPrompts] Database error:', error);
      return { success: false, error: 'Failed to fetch analysis data' };
    }

    const characterBible = analyses?.find(a => a.output_type === 'CHARACTER_BIBLE');
    const onePager = analyses?.find(a => a.output_type === 'ONE_PAGER');

    if (!characterBible) {
      return { success: false, error: 'No CHARACTER_BIBLE found for this document' };
    }

    // Extract visual style context from ONE_PAGER
    const visualStyle = onePager?.content?.visualStyle || {};
    const cinematography = visualStyle.cinematography || 'cinematic lighting, professional photography';
    const mood = visualStyle.mood || 'dramatic, emotional';
    const colorPalette = visualStyle.colorPalette?.join(', ') || 'warm tones';

    console.log('[ExtractPrompts] Visual style context:', { cinematography, mood, colorPalette });

    const characters = characterBible.content?.characters || [];
    console.log('[ExtractPrompts] Found', characters.length, 'characters');

    const characterPrompts: CharacterPrompt[] = characters
      .filter((char: Character) => char.role === 'protagonist' || char.role === 'supporting')
      .map((character: Character) => {
        // Extract visual elements from character data
        const physicalDesc = character.physicalDescription || 'Indian character';
        const personality = character.personality?.slice(0, 3)?.join(', ') || 'expressive';
        const clothing = extractClothingFromDescription(physicalDesc);

        // Generate optimized prompt
        const basePrompt = `${physicalDesc}, ${personality} expression, ${clothing}`;
        const stylePrompt = `${cinematography}, ${mood}, high quality, detailed, professional photography`;
        const fullPrompt = `${basePrompt}, ${stylePrompt}`;

        console.log('[ExtractPrompts] Generated prompt for', character.name, ':', fullPrompt.substring(0, 100) + '...');

        return {
          characterName: character.name,
          prompt: fullPrompt,
          castingSuggestions: character.castingSuggestions || [],
          role: character.role,
        };
      });

    return {
      success: true,
      characterPrompts,
    };
  } catch (error) {
    console.error('[ExtractPrompts] Error extracting character prompts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract location prompts from script analysis and ONE_PAGER data
 */
export async function extractLocationPrompts(documentId: string): Promise<VisualPromptsResult> {
  try {
    console.log('[ExtractPrompts] Extracting location prompts for document:', documentId);

    const supabase = supabaseAdmin;

    // Get ONE_PAGER for production notes and visual style
    console.log('[ExtractPrompts] Querying database for document:', documentId);
    const { data: analyses, error } = await supabase
      .from('script_analysis_outputs')
      .select('output_type, content')
      .eq('document_id', documentId)
      .in('output_type', ['ONE_PAGER', 'SYNOPSIS']);

    console.log('[ExtractPrompts] Database response:', { data: analyses?.length, error });

    if (error) {
      console.error('[ExtractPrompts] Database error:', error);
      return { success: false, error: 'Failed to fetch analysis data' };
    }

    const onePager = analyses?.find(a => a.output_type === 'ONE_PAGER');
    const synopsis = analyses?.find(a => a.output_type === 'SYNOPSIS');

    if (!onePager) {
      return { success: false, error: 'No ONE_PAGER found for this document' };
    }

    // Extract visual style and production context
    const visualStyle = onePager.content?.visualStyle || {};
    const productionNotes = onePager.content?.productionNotes || {};
    const cinematography = visualStyle.cinematography || 'cinematic lighting, wide shots';
    const mood = visualStyle.mood || 'atmospheric, emotional';
    const colorPalette = visualStyle.colorPalette?.join(', ') || 'warm, natural tones';

    // Extract locations from synopsis and production notes
    const synopsisText = synopsis?.content?.long || synopsis?.content?.short || '';
    const locationCount = productionNotes.locationCount || 3;
    const specialRequirements = productionNotes.specialRequirements || [];

    console.log('[ExtractPrompts] Production context:', { locationCount, specialRequirements });

    // Generate location prompts based on story context
    const locationPrompts: LocationPrompt[] = generateLocationPromptsFromStory(
      synopsisText,
      cinematography,
      mood,
      colorPalette,
      specialRequirements
    );

    console.log('[ExtractPrompts] Generated', locationPrompts.length, 'location prompts');

    return {
      success: true,
      locationPrompts,
    };
  } catch (error) {
    console.error('[ExtractPrompts] Error extracting location prompts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate location prompts based on story synopsis and visual style
 */
function generateLocationPromptsFromStory(
  synopsis: string,
  cinematography: string,
  mood: string,
  colorPalette: string,
  specialRequirements: string[]
): LocationPrompt[] {
  const locations: LocationPrompt[] = [];

  // Analyze synopsis for location keywords
  const isPunjabi = synopsis.toLowerCase().includes('punjabi') || synopsis.toLowerCase().includes('village');
  const isIndian = synopsis.toLowerCase().includes('indian') || isPunjabi;

  // Base style string
  const baseStyle = `${cinematography}, ${mood}, ${colorPalette}, high quality, detailed, atmospheric`;

  if (isPunjabi) {
    locations.push({
      locationName: 'Village Home',
      description: 'Traditional Punjabi family home',
      prompt: `Traditional Punjabi village house with courtyard, warm lighting, wooden furniture, vibrant fabrics, ${baseStyle}`,
    });

    locations.push({
      locationName: 'Village Street',
      description: 'Authentic village environment',
      prompt: `Rural Punjabi village street, traditional houses, bustling daily life, golden hour lighting, ${baseStyle}`,
    });
  }

  if (isIndian) {
    locations.push({
      locationName: 'Interior Space',
      description: 'Authentic Indian interior',
      prompt: `Traditional Indian home interior, warm lighting, cultural artifacts, family photographs, ${baseStyle}`,
    });
  }

  // Add tech/modern elements if mentioned in special requirements
  if (specialRequirements.some(req => req.toLowerCase().includes('vfx') || req.toLowerCase().includes('robot'))) {
    locations.push({
      locationName: 'Tech Workshop',
      description: 'Modern technology space',
      prompt: `Modern tech workshop with advanced equipment, clean lighting, futuristic elements, ${baseStyle}`,
    });
  }

  // Ensure we have at least 2-3 location prompts
  if (locations.length < 2) {
    locations.push({
      locationName: 'Outdoor Scene',
      description: 'Natural outdoor environment',
      prompt: `Beautiful Indian landscape, natural lighting, scenic environment, ${baseStyle}`,
    });
  }

  return locations;
}

/**
 * Helper function to extract clothing information from physical description
 */
function extractClothingFromDescription(description: string): string {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('traditional') || lowerDesc.includes('punjabi')) return 'traditional Indian attire';
  if (lowerDesc.includes('formal')) return 'formal clothing';
  if (lowerDesc.includes('casual')) return 'casual modern clothing';
  if (lowerDesc.includes('saffron') || lowerDesc.includes('robes')) return 'traditional robes';

  return 'appropriate clothing';
}

/**
 * Extract all visual prompts for a document (characters + locations)
 */
export async function extractAllVisualPrompts(documentId: string): Promise<{
  success: boolean;
  characterPrompts?: CharacterPrompt[];
  locationPrompts?: LocationPrompt[];
  totalPrompts?: number;
  error?: string;
}> {
  console.log('[ExtractPrompts] Extracting all visual prompts for document:', documentId);

  const [characterResult, locationResult] = await Promise.all([
    extractCharacterPrompts(documentId),
    extractLocationPrompts(documentId),
  ]);

  if (!characterResult.success && !locationResult.success) {
    return {
      success: false,
      error: `Failed to extract prompts: ${characterResult.error}, ${locationResult.error}`,
    };
  }

  const characterPrompts = characterResult.characterPrompts || [];
  const locationPrompts = locationResult.locationPrompts || [];
  const totalPrompts = characterPrompts.length + locationPrompts.length;

  console.log('[ExtractPrompts] Total prompts extracted:', totalPrompts);
  console.log('[ExtractPrompts] Characters:', characterPrompts.length, 'Locations:', locationPrompts.length);

  return {
    success: true,
    characterPrompts,
    locationPrompts,
    totalPrompts,
  };
}