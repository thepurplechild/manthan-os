'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  // Validate file size (50MB)
  if (file.size > 50 * 1024 * 1024) {
    return { error: 'File size exceeds 50MB limit' }
  }

  // Validate file type
  const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Only PDF, TXT, and MD files are allowed' }
  }

  // Create unique file path with user ID
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${user.id}/${fileName}`

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('creator-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('creator-assets').getPublicUrl(filePath)

  // Insert document record into database
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id,
      title: file.name,
      storage_url: publicUrl,
      storage_path: filePath,
      file_size_bytes: file.size,
      processing_status: 'UPLOADED',
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('creator-assets').remove([filePath])
    return { error: `Database error: ${dbError.message}` }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/documents')

  return { success: true, document }
}