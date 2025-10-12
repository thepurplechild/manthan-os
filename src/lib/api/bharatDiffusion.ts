'use server';

const SEGMIND_API_KEY = process.env.SEGMIND_API_KEY!;
const SEGMIND_API_BASE = 'https://api.segmind.com/v1';

interface BharatDiffusionRequest {
  prompt: string;
  style?: 'realistic' | 'cinematic' | 'cyberpunk' | 'anime' | 'oil_painting' | 'watercolor';
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  negativePrompt?: string;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    imageUrl?: string;
    error?: string;
    [key: string]: unknown;
  };
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  if (!process.env.SEGMIND_API_KEY) {
    throw new Error('Missing SEGMIND_API_KEY environment variable');
  }
  console.log('[Segmind] Environment variables validated ✓');
  console.log('[Segmind] API Key:', SEGMIND_API_KEY.substring(0, 10) + '...');
}

// Validate on module load
validateEnvironment();

/**
 * Map aspect ratio to dimensions
 */
function getImageSize(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case 'portrait':
      return { width: 768, height: 1024 };
    case 'landscape':
      return { width: 1024, height: 768 };
    case 'square':
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Enhance prompt with style and Indian context
 */
function enhancePromptWithStyle(prompt: string, style?: string): string {
  const styleEnhancements: Record<string, string> = {
    realistic: 'photorealistic, highly detailed, professional photography, 8k',
    cinematic: 'cinematic lighting, dramatic, bollywood movie quality, epic composition',
    cyberpunk: 'cyberpunk aesthetic, neon lights, futuristic, mumbai streets',
    anime: 'anime style, manga art, cel shaded, vibrant colors, indian character',
    oil_painting: 'oil painting style, classical art, textured brushstrokes, mughal painting inspiration',
    watercolor: 'watercolor painting, soft colors, artistic, painted, indian miniature style',
  };

  const enhancement = style ? styleEnhancements[style] || '' : '';
  
  // Add subtle Indian context enhancement
  const contextHint = 'high quality, detailed';
  
  return enhancement 
    ? `${prompt}, ${enhancement}, ${contextHint}` 
    : `${prompt}, ${contextHint}`;
}

/**
 * Choose the best Segmind model based on prompt and style
 */
function selectSegmindModel(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Use Bollywood model for character/portrait prompts
  if (
    lowerPrompt.includes('character') || 
    lowerPrompt.includes('person') || 
    lowerPrompt.includes('actor') ||
    lowerPrompt.includes('actress') ||
    lowerPrompt.includes('face') ||
    lowerPrompt.includes('portrait')
  ) {
    console.log('[Segmind] Selected model: SSD-1B (best for characters)');
    return 'ssd-1b'; // Fast model, good for portraits
  }
  
  // Use general model for locations and scenes
  console.log('[Segmind] Selected model: SDXL (best for scenes)');
  return 'sdxl1.0-txt2img'; // Standard SDXL
}

/**
 * Generate image using Segmind API
 * Drop-in replacement for BharatDiffusion
 */
export async function generateBharatDiffusionImage(
  params: BharatDiffusionRequest
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  console.log('[Segmind] ========================================');
  console.log('[Segmind] Starting image generation');
  console.log('[Segmind] ========================================');

  try {
    console.log('[Segmind] Original params:', {
      prompt: params.prompt.substring(0, 50) + '...',
      style: params.style,
      aspectRatio: params.aspectRatio,
    });

    // Enhance prompt with style
    const enhancedPrompt = enhancePromptWithStyle(params.prompt, params.style);
    const size = getImageSize(params.aspectRatio);
    const model = selectSegmindModel(params.prompt);

    console.log('[Segmind] Enhanced prompt:', enhancedPrompt.substring(0, 100) + '...');
    console.log('[Segmind] Image size:', size);
    console.log('[Segmind] Model:', model);

    const endpoint = `${SEGMIND_API_BASE}/${model}`;
    console.log('[Segmind] Endpoint:', endpoint);

    // Prepare request body
    const requestBody = {
      prompt: enhancedPrompt,
      negative_prompt: params.negativePrompt || 'blurry, low quality, distorted, ugly, bad anatomy, watermark, text',
      samples: 1,
      scheduler: 'DDIM',
      num_inference_steps: 25,
      guidance_scale: 7.5,
      seed: Math.floor(Math.random() * 1000000),
      img_width: size.width,
      img_height: size.height,
      base64: false, // Get URL instead of base64
    };

    console.log('[Segmind] Request body:', {
      ...requestBody,
      prompt: requestBody.prompt.substring(0, 50) + '...',
    });

    // Call Segmind API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': SEGMIND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Segmind] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Segmind] API error:', errorText);
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid Segmind API key. Please check your SEGMIND_API_KEY.',
        };
      }
      
      if (response.status === 402) {
        return {
          success: false,
          error: 'Segmind credits exhausted. Please add credits at https://www.segmind.com/billing',
        };
      }
      
      return {
        success: false,
        error: `Segmind API error: ${response.status} - ${errorText}`,
      };
    }

    // Segmind returns the image directly as a blob
    const imageBlob = await response.blob();
    console.log('[Segmind] Image received, size:', imageBlob.size, 'bytes');

    // Convert blob to base64 for temporary storage
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const imageUrl = `data:image/png;base64,${base64}`;

    console.log('[Segmind] ✓ Generation successful!');
    console.log('[Segmind] Image size:', imageBlob.size, 'bytes');
    console.log('[Segmind] ========================================');

    return {
      success: true,
      imageUrl: imageUrl, // Base64 data URL
    };
  } catch (error) {
    console.error('[Segmind] ========================================');
    console.error('[Segmind] ✗ Generation failed');
    console.error('[Segmind] Error:', error);
    console.error('[Segmind] ========================================');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during image generation',
    };
  }
}

/**
 * Test the API connection
 */
export async function testBharatDiffusionConnection(): Promise<TestConnectionResult> {
  console.log('[Segmind] Testing API connection...');

  try {
    const result = await generateBharatDiffusionImage({
      prompt: 'a simple red circle on white background',
      style: 'realistic',
      aspectRatio: 'square',
    });

    if (result.success) {
      return {
        success: true,
        message: 'Segmind API connection successful!',
        details: {
          imageUrl: result.imageUrl,
        },
      };
    } else {
      return {
        success: false,
        message: 'Segmind API test failed',
        details: {
          error: result.error,
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Segmind API test threw an exception',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}