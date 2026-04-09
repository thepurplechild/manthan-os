'use client'

import { useEffect, useRef, useState } from 'react'
import { Bookmark, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'

type ReferenceType = 'film' | 'book' | 'image' | 'music' | 'other'

interface Reference {
  id: string
  type: ReferenceType
  title: string
  note: string
}

const typeBadgeStyle: Record<ReferenceType, string> = {
  film: 'border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#3B82F6]',
  book: 'border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981]',
  image: 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]',
  music: 'border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-[#8B5CF6]',
  other: 'border-[#888888]/40 bg-[#888888]/15 text-[#888888]',
}

interface ReferencesPanelProps {
  projectId: string
  isVisible: boolean
  onToggle: () => void
}

export function ReferencesPanel({ projectId, isVisible, onToggle }: ReferencesPanelProps) {
  const [toneStatement, setToneStatement] = useState('')
  const [references, setReferences] = useState<Reference[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`canvas-references-${projectId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.toneStatement) setToneStatement(parsed.toneStatement)
        if (parsed.references) setReferences(parsed.references)
      } catch { /* ignore */ }
    }
  }, [projectId])

  useEffect(() => {
    localStorage.setItem(
      `canvas-references-${projectId}`,
      JSON.stringify({ toneStatement, references })
    )
  }, [toneStatement, references, projectId])

  const addReference = () => {
    setReferences((prev) => [...prev, { id: `ref-${Date.now()}`, type: 'film', title: '', note: '' }])
  }

  const updateReference = (id: string, field: keyof Reference, value: string) => {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const removeReference = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id))
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Please log in.'); return }

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'bin'
        const storagePath = `${user.id}/ref-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('creator-assets').upload(storagePath, file, {
          contentType: file.type,
        })
        if (error) { toast.error('Upload failed'); continue }

        await supabase.from('documents').insert({
          owner_id: user.id,
          project_id: projectId,
          title: file.name,
          storage_url: supabase.storage.from('creator-assets').getPublicUrl(storagePath).data.publicUrl,
          storage_path: storagePath,
          mime_type: file.type,
          file_size_bytes: file.size,
          processing_status: 'COMPLETED',
          asset_type: 'REFERENCE',
          is_primary: false,
        })

        setReferences((prev) => [
          ...prev,
          { id: `ref-${Date.now()}`, type: 'image', title: file.name, note: '' },
        ])
      }
      toast.success('Reference images uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const healthStatus = toneStatement || references.length > 0
    ? toneStatement && references.length > 0 ? 'complete' as const : 'partial' as const
    : null

  return (
    <CanvasPanel
      id="references"
      title="References"
      icon={<Bookmark className="h-4 w-4" />}
      isVisible={isVisible}
      onToggle={onToggle}
      defaultWidth="full"
      healthStatus={healthStatus}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Tone Statement</label>
          <input
            value={toneStatement}
            onChange={(e) => setToneStatement(e.target.value)}
            placeholder="e.g. Early Mira Nair meets Gulzar — intimate, specific, emotionally devastating"
            className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">References</label>
          {references.map((ref) => (
            <div key={ref.id} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={ref.type}
                  onChange={(e) => updateReference(ref.id, 'type', e.target.value)}
                  className="rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E5E5] focus:outline-none"
                >
                  <option value="film">Film</option>
                  <option value="book">Book</option>
                  <option value="image">Image</option>
                  <option value="music">Music</option>
                  <option value="other">Other</option>
                </select>
                <Badge className={`border text-[10px] capitalize ${typeBadgeStyle[ref.type]}`}>{ref.type}</Badge>
                <input
                  value={ref.title}
                  onChange={(e) => updateReference(ref.id, 'title', e.target.value)}
                  placeholder="Title"
                  className="flex-1 bg-transparent text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none"
                />
                <button type="button" onClick={() => removeReference(ref.id)} className="text-[#555555] hover:text-[#EF4444]">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <input
                value={ref.note}
                onChange={(e) => updateReference(ref.id, 'note', e.target.value)}
                placeholder="Why is this a reference? What quality are you borrowing?"
                className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addReference}
            className="flex items-center gap-1.5 text-sm text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Reference
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Upload Reference Images</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-[8px] border border-dashed border-[#2A2A2A] bg-[#0A0A0A] px-3 py-4 text-xs text-[#555555] hover:border-[#C8A97E]/50 hover:text-[#888888] transition-colors"
          >
            {uploading ? 'Uploading...' : 'Drop or click to upload images'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
          />
        </div>
      </div>
    </CanvasPanel>
  )
}
