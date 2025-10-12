'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface EditAssetParams {
  assetId: string;
  title?: string;
  assetType?: string;
  metadata?: Record<string, string | number | boolean>;
}

export async function editAsset({ assetId, title, assetType, metadata }: EditAssetParams) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get asset to verify ownership
  const { data: asset, error: fetchError } = await supabase
    .from('documents')
    .select('id, owner_id, project_id, title')
    .eq('id', assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: 'Asset not found' };
  }

  // Verify ownership
  if (asset.owner_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Build update object
  const updates: {
    title?: string;
    asset_type?: string;
    asset_metadata?: Record<string, string | number | boolean>;
  } = {};
  if (title !== undefined) updates.title = title;
  if (assetType !== undefined) updates.asset_type = assetType;
  if (metadata !== undefined) updates.asset_metadata = metadata;

  // Update asset
  const { error: updateError } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', assetId);

  if (updateError) {
    console.error('Update error:', updateError);
    return { success: false, error: 'Failed to update asset' };
  }

  // Revalidate pages
  revalidatePath(`/dashboard/projects/${asset.project_id}`);
  revalidatePath('/dashboard/projects');

  return { success: true, assetTitle: title || asset.title };
}