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
  const apiKey = process.env.PIXELBIN_API_KEY;
  const orgId = process.env.PIXELBIN_ORG_ID;

  if (!apiKey || !orgId) {
    return { success: false, error: 'API credentials not configured' };
  }

  try {
    // PixelBin API endpoint
    const endpoint = `https://api.pixelbin.io/service/platform/assets/v1.0/organization/${orgId}/plugins/bharatDiffusion_generate`;

    const requestBody = {
      prompt: params.prompt,
      num_images_per_prompt: params.num_images_per_prompt || 1,
      num_inference_steps: params.num_inference_steps || 20,
      generation_style: params.generation_style || 'realistic',
      aspect_ratio: params.aspect_ratio || 'square',
      guidance_scale: params.guidance_scale || 7.5,
      use_deepcache: params.use_deepcache || false,
      seed: params.seed || Math.floor(Math.random() * 100000),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `API error: ${response.status}`
      };
    }

    const data = await response.json();

    // Extract image URL from response (adjust based on actual response format)
    const imageUrl = data.url || data.image_url || data.result?.url || data.data?.url;

    if (!imageUrl) {
      return { success: false, error: 'No image URL in response' };
    }

    return { success: true, imageUrl };
  } catch (error) {
    console.error('BharatDiffusion generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    };
  }
}