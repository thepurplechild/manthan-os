'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDocuments() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { success: true, documents }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get document to verify ownership and get storage path
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('owner_id, storage_path')
    .eq('id', documentId)
    .single()

  if (fetchError || !document) {
    return { error: 'Document not found' }
  }

  if (document.owner_id !== user.id) {
    return { error: 'Unauthorized' }
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('creator-assets')
    .remove([document.storage_path])

  if (storageError) {
    return { error: 'Failed to delete file from storage' }
  }

  // Delete from database (sections will cascade delete)
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (dbError) {
    return { error: dbError.message }
  }

  revalidatePath('/dashboard/documents')

  return { success: true }
}

export async function getDocumentById(documentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !document) {
    return { error: 'Document not found' }
  }

  if (document.owner_id !== user.id) {
    return { error: 'Unauthorized' }
  }

  return { success: true, document }
}

export async function getDocumentViewUrl(documentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single()

  if (docError || !document) {
    return { error: 'Document not found' }
  }

  const { data, error } = await supabase.storage
    .from('creator-assets')
    .createSignedUrl(document.storage_path, 3600)

  if (error || !data) {
    return { error: 'Failed to generate URL' }
  }

  return { url: data.signedUrl }
}

export async function getDocumentDownloadUrl(documentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('storage_path, title')
    .eq('id', documentId)
    .single()

  if (docError || !document) {
    return { error: 'Document not found' }
  }

  const { data, error } = await supabase.storage
    .from('creator-assets')
    .createSignedUrl(document.storage_path, 60)

  if (error || !data) {
    return { error: 'Failed to generate download URL' }
  }

  return { url: data.signedUrl, title: document.title }
}