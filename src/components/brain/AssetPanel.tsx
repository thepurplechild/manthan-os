'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/types/projects'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Image as ImageIcon, Plus } from 'lucide-react'
import { toast } from 'sonner'

type AssetItem = {
  id: string
  title: string
  asset_type: string
  processing_status: string
  file_size_bytes: number
  created_at: string
}

interface AssetPanelProps {
  projectId: string
  assets: AssetItem[]
  onAssetAdded: () => Promise<void>
}

export function AssetPanel({ projectId, assets, onAssetAdded }: AssetPanelProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadProgress(0)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in again.')
        return
      }

      const selectedFiles = Array.from(files)
      let completed = 0

      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop() || 'bin'
        const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage.from('creator-assets').upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })
        if (uploadError) throw uploadError

        const { data: publicData } = supabase.storage.from('creator-assets').getPublicUrl(storagePath)

        const { data: doc, error: docError } = await supabase
          .from('documents')
          .insert({
            owner_id: user.id,
            project_id: projectId,
            title: file.name,
            storage_url: publicData.publicUrl,
            storage_path: storagePath,
            mime_type: file.type || null,
            file_size_bytes: file.size,
            processing_status: 'UPLOADED',
            extracted_text: null,
            asset_type: 'SCRIPT',
            is_primary: false,
          })
          .select('id')
          .single()

        if (docError || !doc) throw new Error(docError?.message || 'Failed to create document')

        await fetch('/api/inngest/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'document.uploaded',
            data: {
              documentId: doc.id,
              userId: user.id,
              storagePath,
              fileName: file.name,
            },
          }),
        })

        completed += 1
        setUploadProgress(Math.round((completed / selectedFiles.length) * 100))
      }

      await onAssetAdded()
      router.refresh()
      toast.success('Asset upload complete')
    } catch (error) {
      console.error('Asset upload failed:', error)
      toast.error('Upload failed. Please retry.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="h-full bg-[#0D0D0D] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#C8A97E]">Assets</div>
        <Button
          size="sm"
          className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a]"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Asset
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.txt,.md"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {uploading && (
        <div className="text-xs text-[#C8A97E] animate-pulse">Uploading assets... {uploadProgress}%</div>
      )}

      <div className="space-y-2">
        {assets.length === 0 ? (
          <div className="text-sm text-[#666666]">No assets yet. Upload your first file.</div>
        ) : (
          assets.map((asset) => {
            const isImage = (asset.asset_type || '').toUpperCase().includes('IMAGE')
            const status = (asset.processing_status || '').toUpperCase()
            return (
              <div key={asset.id} className="rounded-[8px] border border-[#1A1A1A] p-3 hover:bg-[#111111] transition-colors">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-[#888888]">{isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-[#E5E5E5]">{asset.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className="bg-[#1A1A1A] text-[#C8A97E] border border-[#2A2A2A]">{asset.asset_type || 'DOCUMENT'}</Badge>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          status === 'EXTRACTION_FAILED'
                            ? 'bg-red-500'
                            : status === 'COMPLETED'
                              ? 'bg-[#C8A97E]'
                              : 'bg-[#666666] animate-pulse'
                        }`}
                      />
                      <span className="text-xs text-[#666666]">{formatFileSize(asset.file_size_bytes || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
