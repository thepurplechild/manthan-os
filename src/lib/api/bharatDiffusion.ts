import { PixelbinConfig, PixelbinClient } from '@pixelbin/admin';

interface BharatDiffusionParams {
  prompt: string;
  num_images_per_prompt?: number;
  num_inference_steps?: number;
  generation_style?: 'realistic' | 'cinematic' | 'cyberpunk' | 'digitalart' | 'fantasy' | 'anime';
  aspect_ratio?: 'square' | 'portrait' | 'landscape';
  guidance_scale?: number;
  use_deepcache?: boolean;
  seed?: number;
}

interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(params: BharatDiffusionParams): Promise<GenerationResult> {
  // Try access token first, fallback to API key
  const apiToken = process.env.PIXELBIN_ACCESS_TOKEN || process.env.PIXELBIN_API_KEY;

  if (!apiToken) {
    return { success: false, error: 'PixelBin credentials not configured' };
  }

  try {
    // Initialize PixelBin client
    const pixelbin = new PixelbinClient(
      new PixelbinConfig({
        domain: "https://api.pixelbin.io",
        apiSecret: apiToken,
      }),
    );

    console.log('Creating BharatDiffusion prediction with token:', apiToken.substring(0, 8) + '...');

    // Use the predictions.createAndWait method
    const result = await pixelbin.predictions.createAndWait({
      name: "bharatDiffusion_generate",
      input: {
        prompt: params.prompt,
        num_images_per_prompt: params.num_images_per_prompt || 1,
        num_inference_steps: params.num_inference_steps || 20,
        generation_style: params.generation_style || 'realistic',
        aspect_ratio: params.aspect_ratio || 'square',
        guidance_scale: params.guidance_scale || 7.5,
        use_deepcache: params.use_deepcache || false,
        seed: params.seed || Math.floor(Math.random() * 100000),
      }
    });

    console.log('BharatDiffusion response:', JSON.stringify(result, null, 2));

    // Extract image URL from result
    let imageUrl: string | undefined;
    
    if (typeof result?.output === 'string') {
      imageUrl = result.output;
    } else if (result?.output?.url) {
      imageUrl = result.output.url;
    } else if (result?.url) {
      imageUrl = result.url;
    } else if (result?.data?.url) {
      imageUrl = result.data.url;
    }

    if (!imageUrl) {
      console.error('No image URL in response:', result);
      return { 
        success: false, 
        error: 'No image URL in API response. Check console for full response.' 
      };
    }

    return { success: true, imageUrl };
  } catch (error) {
    console.error('BharatDiffusion generation error:', error);
    
    // Extract detailed error message
    let errorMessage = 'Generation failed';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      if ('message' in error) {
        errorMessage = String((error as Record<string, unknown>).message);
      }
      if ('response' in error) {
        console.error('API Error Response:', (error as Record<string, unknown>).response);
      }
    }

    return { success: false, error: errorMessage };
  }
}