'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'


function UploadPageImpl() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown']
    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF, TXT, and MD files are supported')
      return
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size must be under 50MB')
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const supabase = createClient()

      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Authentication required')
      }

      setProgress(20)

      // Generate unique storage path
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      setProgress(30)

      // Upload directly to Supabase Storage (client-side, bypasses Vercel)
      const { error: storageError } = await supabase.storage
        .from('creator-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (storageError) throw storageError

      setProgress(60)

      // Get public URL for storage reference
      const { data: { publicUrl } } = supabase.storage
        .from('creator-assets')
        .getPublicUrl(fileName)

      setProgress(70)

      // Create document record in database (direct insert, not Server Action)
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          title: file.name,
          storage_url: publicUrl,
          storage_path: fileName,
          file_size_bytes: file.size,
          processing_status: 'UPLOADED',
          extracted_text: null
        })
        .select()
        .single()

      if (dbError) throw dbError

      setProgress(85)

      // Trigger background processing event (only metadata, not file data)
      await fetch('/api/inngest/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'document.uploaded',
          data: {
            documentId: document.id,
            userId: user.id,
            storagePath: fileName,
            fileName: file.name
          }
        })
      })

      setProgress(100)

      toast.success('File uploaded! Extracting text in background...')
      router.push('/dashboard/documents')

    } catch (error: unknown) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    onDrop
  })


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Document</h1>
        <p className="text-muted-foreground mt-2">
          Upload your script or document for AI analysis
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive
                ? 'Drop your file here'
                : 'Drag and drop your script here, or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF, TXT, and MD files up to 50MB
            </p>
          </div>

          {uploading && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">What happens after upload?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Your script will be securely stored and processed in the background</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Text extraction and AI analysis will happen automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>You&apos;ll be notified when processing is complete</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default UploadPageImpl