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
  const apiToken = process.env.PIXELBIN_API_KEY;

  if (!apiToken) {
    return { success: false, error: 'PIXELBIN_API_KEY not configured' };
  }

  try {
    // Initialize PixelBin client
    const pixelbin = new PixelbinClient(
      new PixelbinConfig({
        domain: "https://api.pixelbin.io",
        apiSecret: apiToken,
      }),
    );

    console.log('Creating BharatDiffusion prediction...');

    // Use the predictions.createAndWait method as shown in docs
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

    console.log('BharatDiffusion response:', result);

    // Extract image URL from result
    // The response structure may be: result.output or result.data or result.url
    const imageUrl = result?.output?.url || result?.output || result?.url || result?.data?.url;

    if (!imageUrl) {
      console.error('No image URL in response:', result);
      return { success: false, error: 'No image URL in API response' };
    }

    return { success: true, imageUrl };
  } catch (error) {
    console.error('BharatDiffusion generation error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Generation failed';

    return { success: false, error: errorMessage };
  }
}