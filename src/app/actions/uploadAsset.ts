'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AssetType } from '@/lib/types/assets';

export async function createAssetRecord({
  title,
  assetType,
  storageUrl,
  storagePath,
  mimeType,
  fileSize,
  parentDocumentId,
  metadata = {},
}: {
  title: string;
  assetType: AssetType;
  storageUrl: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  parentDocumentId: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  console.log('🔄 Creating asset record:', {
    title,
    assetType,
    mimeType,
    fileSize,
    parentDocumentId,
  });

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify parent document exists and user owns it
  const { data: parentDoc, error: parentError } = await supabase
    .from('documents')
    .select('id, owner_id')
    .eq('id', parentDocumentId)
    .single();

  if (parentError || !parentDoc) {
    return { success: false, error: 'Parent document not found' };
  }

  if (parentDoc.owner_id !== user.id) {
    return { success: false, error: 'You do not own this document' };
  }

  // Validate audio MIME types for audio asset types
  const audioMimeTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg',
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/mp4', 'audio/x-m4a', 'audio/m4a',
    'audio/aac', 'audio/ogg'
  ];

  const isAudioAsset = assetType === 'VOICE_SAMPLE' || assetType === 'AUDIO_PILOT';
  const isValidAudioMime = audioMimeTypes.includes(mimeType) || mimeType.startsWith('audio/');

  if (isAudioAsset && !isValidAudioMime) {
    console.error('❌ Invalid audio MIME type:', mimeType, 'for asset type:', assetType);
    return {
      success: false,
      error: `Invalid audio file type: ${mimeType}. Please use MP3, WAV, or M4A files.`
    };
  }

  console.log('✅ MIME type validation passed:', {
    assetType,
    mimeType,
    isAudioAsset,
    isValidAudioMime
  });

  // Create asset document record
  const insertData = {
    owner_id: user.id,
    title,
    asset_type: assetType,
    storage_url: storageUrl,
    storage_path: storagePath,
    mime_type: mimeType,
    file_size_bytes: fileSize,
    processing_status: 'COMPLETED',
    parent_document_id: parentDocumentId,
    is_primary: false,
    asset_metadata: metadata,
  };

  console.log('💾 Inserting into database:', insertData);

  const { data: newAsset, error: insertError } = await supabase
    .from('documents')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to create asset record:', insertError);
    return { success: false, error: `Failed to create asset record: ${insertError.message}` };
  }

  console.log('✅ Asset record created successfully:', newAsset?.id);

  // Revalidate the document page to show new asset
  revalidatePath(`/dashboard/documents/${parentDocumentId}`);

  return { success: true, data: newAsset };
}