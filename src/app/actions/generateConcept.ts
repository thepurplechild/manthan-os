'use server';

import { createClient } from '@/lib/supabase/server';
import { generateBharatDiffusionImage } from '@/lib/api/bharatDiffusion';

export async function generateImage(params: {
  prompt: string;
  conceptType: 'character' | 'location';
  style: 'realistic' | 'cinematic' | 'cyberpunk' | 'anime' | 'oil_painting' | 'watercolor';
  aspectRatio: 'square' | 'portrait' | 'landscape';
  projectId: string;
}): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log('[GenerateConcept] Starting image generation for user:', user.id);

    // 2. Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', params.projectId)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found or access denied' };
    }

    // 3. Generate image using Segmind
    console.log('[GenerateConcept] Calling Segmind API...');

    const generationResult = await generateBharatDiffusionImage({
      prompt: params.prompt,
      style: params.style,
      aspectRatio: params.aspectRatio,
      negativePrompt: 'blurry, low quality, distorted, ugly, bad anatomy, watermark, text',
      conceptType: params.conceptType,
    });

    if (!generationResult.success || !generationResult.imageUrl) {
      console.error('[GenerateConcept] Generation failed:', generationResult.error);
      return {
        success: false,
        error: generationResult.error || 'Failed to generate image',
      };
    }

    console.log('[GenerateConcept] Image generated successfully');

    // 4. Download/process image from Segmind
    const imageUrl = generationResult.imageUrl;
    let imageBuffer: ArrayBuffer;

    if (imageUrl.startsWith('data:image')) {
      // Base64 data URL from Segmind
      console.log('[GenerateConcept] Processing base64 image...');
      const base64Data = imageUrl.split(',')[1];
      const binaryString = Buffer.from(base64Data, 'base64');
      imageBuffer = binaryString.buffer;
    } else {
      // Regular URL (fallback for other providers)
      console.log('[GenerateConcept] Downloading image from URL...');
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        return {
          success: false,
          error: 'Failed to download generated image',
        };
      }
      
      imageBuffer = await imageResponse.arrayBuffer();
    }

    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    console.log('[GenerateConcept] Image size:', imageBuffer.byteLength, 'bytes');

    // 5. Upload to Supabase Storage
    const filename = `${params.conceptType}_${Date.now()}.png`;
    const storagePath = `${params.projectId}/${filename}`;

    console.log('[GenerateConcept] Uploading to storage:', storagePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('creator-assets')
      .upload(storagePath, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[GenerateConcept] Upload error:', uploadError);
      return {
        success: false,
        error: `Failed to upload image: ${uploadError.message}`,
      };
    }

    console.log('[GenerateConcept] Upload successful:', uploadData.path);

    // 6. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('creator-assets')
      .getPublicUrl(storagePath);

    console.log('[GenerateConcept] Public URL:', publicUrl);

    // 7. Create document record
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        project_id: params.projectId,
        owner_id: user.id,
        title: `${params.conceptType}_concept_${Date.now()}`,
        asset_type: 'IMAGE_CONCEPT',
        storage_url: publicUrl,
        storage_path: storagePath,
        file_size_bytes: imageBuffer.byteLength,
        processing_status: 'READY',
        asset_metadata: {
          generated_by: 'Segmind',
          prompt: params.prompt,
          style: params.style,
          aspectRatio: params.aspectRatio,
          conceptType: params.conceptType,
          generatedAt: new Date().toISOString(),
        },
      });

    if (docError) {
      console.error('[GenerateConcept] Database error:', docError);
      return {
        success: false,
        error: `Failed to save metadata: ${docError.message}`,
      };
    }

    console.log('[GenerateConcept] ✓ Complete! Image saved to database');

    return {
      success: true,
      imageUrl: publicUrl,
    };
  } catch (error) {
    console.error('[GenerateConcept] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}