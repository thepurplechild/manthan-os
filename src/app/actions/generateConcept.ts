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
    return { success: false, error: result.error || 'Generation failed' };
  }

  // Download the generated image
  const imageResponse = await fetch(result.imageUrl);
  if (!imageResponse.ok) {
    return { success: false, error: 'Failed to download generated image' };
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();

  // Upload to Supabase Storage
  const timestamp = Date.now();
  const filename = `${timestamp}_${params.conceptType}_concept.png`;
  const storagePath = `${params.projectId}/concepts/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('creator-assets')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return { success: false, error: 'Failed to save generated image' };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('creator-assets')
    .getPublicUrl(storagePath);

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
      file_size_bytes: imageBlob.size,
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
    return { success: false, error: 'Failed to save concept to database' };
  }

  // Revalidate pages
  revalidatePath(`/dashboard/projects/${params.projectId}`);
  revalidatePath('/dashboard/projects');

  return {
    success: true,
    assetId: newAsset.id,
    imageUrl: publicUrl,
  };
}