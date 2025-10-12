'use server';

import { createClient } from '@/lib/supabase/server';
import { generateImage } from '@/lib/api/bharatDiffusion';
import { revalidatePath } from 'next/cache';

interface GenerateConceptParams {
  projectId: string;
  prompt: string;
  conceptType: 'character' | 'location';
  generationStyle?: 'realistic' | 'cinematic' | 'cyberpunk' | 'digitalart' | 'fantasy' | 'anime';
  aspectRatio?: 'square' | 'portrait' | 'landscape';
}

export async function generateConcept(params: GenerateConceptParams) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, owner_id')
    .eq('id', params.projectId)
    .single();

  if (projectError || !project || project.owner_id !== user.id) {
    return { success: false, error: 'Project not found or unauthorized' };
  }

  console.log('Generating concept with params:', params);

  // Generate image with BharatDiffusion
  const result = await generateImage({
    prompt: params.prompt,
    generation_style: params.generationStyle || 'realistic',
    aspect_ratio: params.aspectRatio || 'square',
    num_images_per_prompt: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5,
  });

  if (!result.success || !result.imageUrl) {
    console.error('Generation failed:', result.error);
    return { success: false, error: result.error || 'Generation failed' };
  }

  console.log('Generated image URL:', result.imageUrl);

  try {
    // Download the generated image
    const imageResponse = await fetch(result.imageUrl);
    
    if (!imageResponse.ok) {
      return { success: false, error: `Failed to download image: ${imageResponse.statusText}` };
    }

    // Get the image as ArrayBuffer, then convert to Uint8Array
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageUint8Array = new Uint8Array(imageArrayBuffer);

    console.log('Downloaded image, size:', imageUint8Array.length, 'bytes');

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const filename = `${timestamp}_${params.conceptType}_concept.png`;
    const storagePath = `${params.projectId}/concepts/${filename}`;

    console.log('Uploading to storage:', storagePath);

    const { error: uploadError } = await supabase.storage
      .from('creator-assets')
      .upload(storagePath, imageUint8Array, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: `Failed to save image: ${uploadError.message}` };
    }

    console.log('Image uploaded successfully');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('creator-assets')
      .getPublicUrl(storagePath);

    console.log('Public URL:', publicUrl);

    // Create database record
    const { data: newAsset, error: dbError } = await supabase
      .from('documents')
      .insert({
        owner_id: user.id,
        project_id: params.projectId,
        title: `AI Generated ${params.conceptType === 'character' ? 'Character' : 'Location'} Concept`,
        asset_type: 'IMAGE_CONCEPT',
        storage_url: publicUrl,
        storage_path: storagePath,
        mime_type: 'image/png',
        file_size_bytes: imageUint8Array.length,
        processing_status: 'COMPLETED',
        is_primary: false,
        asset_metadata: {
          generatedBy: 'bharatDiffusion',
          prompt: params.prompt,
          style: params.generationStyle || 'realistic',
          conceptType: params.conceptType,
          generatedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('creator-assets').remove([storagePath]);
      return { success: false, error: `Failed to save concept: ${dbError.message}` };
    }

    console.log('Database record created:', newAsset.id);

    // Revalidate pages
    revalidatePath(`/dashboard/projects/${params.projectId}`);
    revalidatePath('/dashboard/projects');

    return { 
      success: true, 
      assetId: newAsset.id,
      imageUrl: publicUrl,
    };
  } catch (error) {
    console.error('Concept generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process generated image'
    };
  }
}