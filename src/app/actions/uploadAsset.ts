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
}: {
  title: string;
  assetType: AssetType;
  storageUrl: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  parentDocumentId: string;
}) {
  const supabase = await createClient();

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

  // Create asset document record
  const { data: newAsset, error: insertError } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id, // Copy owner from parent for simple RLS
      title,
      asset_type: assetType,
      storage_url: storageUrl,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      processing_status: 'COMPLETED', // Images don't need processing
      parent_document_id: parentDocumentId,
      is_primary: false,
      asset_metadata: {},
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create asset record:', insertError);
    return { success: false, error: 'Failed to create asset record' };
  }

  // Revalidate the document page to show new asset
  revalidatePath(`/dashboard/documents/${parentDocumentId}`);

  return { success: true, data: newAsset };
}