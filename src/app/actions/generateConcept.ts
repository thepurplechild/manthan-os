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

  console.log('🟢 Generating concept with params:', params);

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
    console.error('❌ Generation failed:', result.error);
    return { success: false, error: result.error || 'Generation failed' };
  }

  console.log('✅ Generated image URL:', result.imageUrl);

  try {
    // STEP 1: Fetch the image with detailed logging
    console.log('📥 Fetching image from URL...');
    const imageResponse = await fetch(result.imageUrl);

    console.log('📥 Fetch response status:', imageResponse.status);
    console.log('📥 Fetch response ok:', imageResponse.ok);
    console.log('📥 Content-Type:', imageResponse.headers.get('content-type'));
    console.log('📥 Content-Length:', imageResponse.headers.get('content-length'));

    if (!imageResponse.ok) {
      console.error('❌ Image fetch failed:', imageResponse.statusText);
      return { success: false, error: `Failed to download image: ${imageResponse.statusText}` };
    }

    // STEP 2: Try multiple data formats
    let uploadData: Uint8Array | Buffer | Blob;
    let dataFormat: string;

    try {
      // Attempt 1: Get as Blob first (most reliable for images)
      console.log('🔄 Attempting to get image as Blob...');
      const imageBlob = await imageResponse.blob();
      console.log('✅ Got Blob, size:', imageBlob.size, 'type:', imageBlob.type);

      // Convert Blob to ArrayBuffer to Uint8Array
      const arrayBuffer = await imageBlob.arrayBuffer();
      uploadData = new Uint8Array(arrayBuffer);
      dataFormat = 'Uint8Array from Blob';

      console.log('✅ Converted to Uint8Array, length:', uploadData.length);
      console.log('✅ First 10 bytes:', Array.from(uploadData.slice(0, 10)));

    } catch (blobError) {
      console.error('❌ Blob conversion failed:', blobError);

      // Attempt 2: Try arrayBuffer directly
      console.log('🔄 Attempting arrayBuffer directly...');
      try {
        const imageResponse2 = await fetch(result.imageUrl);
        const arrayBuffer = await imageResponse2.arrayBuffer();
        uploadData = new Uint8Array(arrayBuffer);
        dataFormat = 'Uint8Array from arrayBuffer';
        console.log('✅ Got Uint8Array directly, length:', uploadData.length);
      } catch (arrayError) {
        console.error('❌ ArrayBuffer conversion failed:', arrayError);
        return { success: false, error: 'Failed to convert image data for upload' };
      }
    }

    // STEP 3: Validate data before upload
    if (!uploadData || uploadData.length === 0) {
      console.error('❌ Upload data is empty or invalid');
      console.error('Upload data type:', typeof uploadData);
      console.error('Upload data length:', uploadData?.length);
      return { success: false, error: 'Image data is empty' };
    }

    console.log('✅ Data ready for upload:', dataFormat, 'size:', uploadData.length);

    // STEP 4: Upload to Supabase Storage
    const timestamp = Date.now();
    const filename = `${timestamp}_${params.conceptType}_concept.png`;
    const storagePath = `${params.projectId}/concepts/${filename}`;

    console.log('📤 Uploading to storage:', storagePath);
    console.log('📤 Upload data type:', uploadData.constructor.name);
    console.log('📤 Upload data length:', uploadData.length);

    const { error: uploadError, data: uploadData_result } = await supabase.storage
      .from('creator-assets')
      .upload(storagePath, uploadData, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      console.error('❌ Error code:', uploadError.error);
      console.error('❌ Error message:', uploadError.message);
      console.error('❌ Error statusCode:', uploadError.statusCode);
      return { success: false, error: `Failed to save image: ${uploadError.message}` };
    }

    console.log('✅ Image uploaded successfully:', uploadData_result);

    // STEP 5: Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('creator-assets')
      .getPublicUrl(storagePath);

    console.log('🔗 Public URL:', publicUrl);

    // STEP 6: Create database record
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
        file_size_bytes: uploadData.length,
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
      console.error('❌ Database insert error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('creator-assets').remove([storagePath]);
      return { success: false, error: `Failed to save concept: ${dbError.message}` };
    }

    console.log('✅ Database record created:', newAsset.id);

    // Revalidate pages
    revalidatePath(`/dashboard/projects/${params.projectId}`);
    revalidatePath('/dashboard/projects');

    return { 
      success: true, 
      assetId: newAsset.id,
      imageUrl: publicUrl,
    };
  } catch (error) {
    console.error('💥 Concept generation error:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process generated image'
    };
  }
}