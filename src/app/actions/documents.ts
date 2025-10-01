'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDocuments() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Fetch all documents for the user
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: `Failed to fetch documents: ${error.message}` }
  }

  return { success: true, documents }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // First, get the document to ensure it belongs to the user and get storage path
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path, owner_id')
    .eq('id', documentId)
    .single()

  if (fetchError) {
    return { error: `Document not found: ${fetchError.message}` }
  }

  if (document.owner_id !== user.id) {
    return { error: 'Unauthorized to delete this document' }
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('creator-assets')
    .remove([document.storage_path])

  if (storageError) {
    console.error('Storage deletion error:', storageError)
    // Continue with database deletion even if storage deletion fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('owner_id', user.id)

  if (dbError) {
    return { error: `Failed to delete document: ${dbError.message}` }
  }

  revalidatePath('/dashboard/documents')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function getDocumentById(documentId: string) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Get the document to ensure it belongs to the user
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('owner_id', user.id)
    .single()

  if (fetchError) {
    return { error: `Document not found: ${fetchError.message}` }
  }

  return {
    success: true,
    document
  }
}

export async function getDocumentViewUrl(documentId: string) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Get the document to ensure it belongs to the user and get storage path
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path, owner_id, title')
    .eq('id', documentId)
    .single()

  if (fetchError) {
    return { error: `Document not found: ${fetchError.message}` }
  }

  if (document.owner_id !== user.id) {
    return { error: 'Unauthorized to access this document' }
  }

  // Create a signed URL valid for 1 hour for viewing
  const { data, error: signedUrlError } = await supabase.storage
    .from('creator-assets')
    .createSignedUrl(document.storage_path, 3600)

  if (signedUrlError) {
    return { error: `Failed to generate view URL: ${signedUrlError.message}` }
  }

  return {
    success: true,
    viewUrl: data.signedUrl
  }
}

export async function getDocumentDownloadUrl(documentId: string) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Get the document to ensure it belongs to the user and get storage path
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path, owner_id, title')
    .eq('id', documentId)
    .single()

  if (fetchError) {
    return { error: `Document not found: ${fetchError.message}` }
  }

  if (document.owner_id !== user.id) {
    return { error: 'Unauthorized to access this document' }
  }

  // Create a signed download URL valid for 1 hour
  const { data, error: signedUrlError } = await supabase.storage
    .from('creator-assets')
    .createSignedUrl(document.storage_path, 3600)

  if (signedUrlError) {
    return { error: `Failed to generate download URL: ${signedUrlError.message}` }
  }

  return {
    success: true,
    downloadUrl: data.signedUrl,
    filename: document.title
  }
}