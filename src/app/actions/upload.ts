'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function uploadDocument(formData: FormData) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect('/login')
    }

    // Get file from form data
    const file = formData.get('file') as File

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PDF, TXT, and MD files are allowed.' }
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size too large. Maximum size is 50MB.' }
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${user.id}/${timestamp}_${sanitizedFileName}`

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('creator-assets')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('creator-assets')
      .getPublicUrl(storagePath)

    // Extract title from filename (remove extension)
    const title = file.name.replace(/\.[^/.]+$/, '')

    // Create database record
    const { data: documentData, error: dbError } = await supabase
      .from('documents')
      .insert({
        title,
        storage_url: urlData.publicUrl,
        owner_id: user.id,
        processing_status: 'UPLOADED'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)

      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('creator-assets')
        .remove([storagePath])

      return { success: false, error: `Database error: ${dbError.message}` }
    }

    return {
      success: true,
      document: documentData,
      message: 'File uploaded successfully'
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}