'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DropZoneProps {
  projectId: string
  onUploadComplete: (documentId: string) => void
  hasAssets: boolean
}

const ACCEPT_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
}

export function DropZone({ projectId, onUploadComplete, hasAssets }: DropZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 })

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in.')
        return null
      }

      const fileExt = file.name.split('.').pop() || 'bin'
      const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('creator-assets').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('creator-assets').getPublicUrl(storagePath)

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          project_id: projectId,
          title: file.name,
          storage_url: publicUrl,
          storage_path: storagePath,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          processing_status: 'UPLOADED',
          asset_type: 'SCRIPT',
          is_primary: false,
        })
        .select('id')
        .single()

      if (docError || !document) throw new Error(docError?.message || 'Failed to create document')

      await fetch('/api/inngest/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'document.uploaded',
          data: {
            documentId: document.id,
            userId: user.id,
            storagePath,
            fileName: file.name,
          },
        }),
      }).catch(() => null)

      return document.id
    },
    [projectId]
  )

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      setUploading(true)
      setUploadCount({ done: 0, total: acceptedFiles.length })

      for (const file of acceptedFiles) {
        try {
          const docId = await uploadFile(file)
          if (docId) onUploadComplete(docId)
        } catch (err) {
          console.error('Upload failed for', file.name, err)
          toast.error(`Failed to upload ${file.name}`)
        }
        setUploadCount((prev) => ({ ...prev, done: prev.done + 1 }))
      }

      setUploading(false)
      setUploadCount({ done: 0, total: 0 })
      if (acceptedFiles.length > 0) toast.success(`${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''} uploaded`)
    },
    [uploadFile, onUploadComplete]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_TYPES,
    disabled: uploading,
  })

  if (hasAssets) {
    return (
      <div
        {...getRootProps()}
        className={`rounded-[8px] border border-dashed p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-[#C8A97E]/50 bg-[#C8A97E]/[0.03]'
            : 'border-[#2A2A2A] hover:border-[#333333]'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-[#C8A97E] text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading {uploadCount.done}/{uploadCount.total}...
          </div>
        ) : isDragActive ? (
          <p className="text-sm text-[#C8A97E]">Drop to add to your story</p>
        ) : (
          <p className="text-sm text-[#444444]">+ Drop more files</p>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`flex flex-1 flex-col items-center justify-center rounded-[8px] border-2 border-dashed p-12 transition-colors cursor-pointer ${
        isDragActive
          ? 'border-[#C8A97E]/50 bg-[#C8A97E]/[0.03]'
          : 'border-[#2A2A2A] hover:border-[#333333]'
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-[#C8A97E] animate-spin" />
          <p className="text-sm text-[#C8A97E]">
            Uploading {uploadCount.done}/{uploadCount.total}...
          </p>
        </div>
      ) : isDragActive ? (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-[#C8A97E]" />
          <p className="text-sm text-[#C8A97E]">Drop to add to your story</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-[#2A2A2A]" />
          <p className="text-sm text-[#444444]">Drop anything here to begin</p>
          <p className="text-xs text-[#444444]">Scripts, images, notes, PDFs, reference images, audio</p>
        </div>
      )}
    </div>
  )
}
