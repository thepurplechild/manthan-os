'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteAsset(assetId: string) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get asset details
  const { data: asset, error: fetchError } = await supabase
    .from('documents')
    .select('id, storage_path, project_id, owner_id, title')
    .eq('id', assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: 'Asset not found' };
  }

  // Verify ownership
  if (asset.owner_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Delete from Storage first
  if (asset.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('creator-assets')
      .remove([asset.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue anyway - file might not exist
    }
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', assetId);

  if (deleteError) {
    console.error('Database deletion error:', deleteError);
    return { success: false, error: 'Failed to delete asset' };
  }

  // Revalidate project pages
  revalidatePath(`/dashboard/projects/${asset.project_id}`);
  revalidatePath('/dashboard/projects');

  return { success: true, assetTitle: asset.title };
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get project details
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, owner_id, title')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    return { success: false, error: 'Project not found' };
  }

  // Verify ownership
  if (project.owner_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get all assets in project for storage cleanup
  const { data: assets } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('project_id', projectId);

  // Delete all files from storage
  if (assets && assets.length > 0) {
    const storagePaths = assets
      .map(a => a.storage_path)
      .filter(Boolean) as string[];

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('creator-assets')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue anyway
      }
    }
  }

  // Delete project (cascade will delete documents due to foreign key)
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (deleteError) {
    console.error('Project deletion error:', deleteError);
    return { success: false, error: 'Failed to delete project' };
  }

  // Revalidate projects page
  revalidatePath('/dashboard/projects');

  return { success: true, projectTitle: project.title };
}