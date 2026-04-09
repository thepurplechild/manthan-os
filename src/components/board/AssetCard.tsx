'use client'

import { useEffect, useState } from 'react'
import { FileText, Image as ImageIcon, Music, Video, File, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatFileSize } from '@/lib/types/projects'

interface AssetExtraction {
  characters?: Array<{ name: string; role: string; description: string }>
  themes?: string[]
  world?: { location?: string; period?: string }
  tone?: string
  asset_summary?: string
}

export interface DocumentItem {
  id: string
  title: string
  asset_type: string
  processing_status: string
  file_size_bytes: number
  mime_type: string
  asset_metadata: AssetExtraction | Record<string, unknown> | null
  created_at: string
  extracted_text?: string | null
  storage_url?: string | null
}

interface AssetCardProps {
  document: DocumentItem
  onDelete: (id: string) => void
  onClick: () => void
}

function FileIcon({ mime }: { mime: string }) {
  if (mime?.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
  if (mime?.startsWith('audio/')) return <Music className="h-4 w-4" />
  if (mime?.startsWith('video/')) return <Video className="h-4 w-4" />
  if (mime?.includes('pdf') || mime?.includes('word') || mime?.includes('text')) return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

function StatusDot({ status }: { status: string }) {
  const upper = (status || '').toUpperCase()
  if (upper === 'EXTRACTION_FAILED') return <span className="h-2 w-2 rounded-full bg-[#EF4444] shrink-0" />
  if (upper === 'READY' || upper === 'COMPLETED') return <span className="h-2 w-2 rounded-full bg-[#C8A97E] shrink-0" />
  return <span className="h-2 w-2 rounded-full bg-[#444444] animate-pulse shrink-0" />
}

export function AssetCard({ document: doc, onDelete, onClick }: AssetCardProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [extraction, setExtraction] = useState<AssetExtraction | null>(
    doc.asset_metadata && typeof doc.asset_metadata === 'object' && Object.keys(doc.asset_metadata).length > 0
      ? (doc.asset_metadata as AssetExtraction)
      : null
  )

  useEffect(() => {
    if (doc.asset_metadata && typeof doc.asset_metadata === 'object' && Object.keys(doc.asset_metadata).length > 0) {
      setExtraction(doc.asset_metadata as AssetExtraction)
    }
  }, [doc.asset_metadata])

  useEffect(() => {
    const status = (doc.processing_status || '').toUpperCase()
    if (
      (status === 'READY' || status === 'COMPLETED') &&
      !extraction &&
      !isExtracting
    ) {
      extractAsset()
    }
  }, [doc.processing_status]) // eslint-disable-line react-hooks/exhaustive-deps

  const extractAsset = async () => {
    setIsExtracting(true)
    try {
      const res = await fetch('/api/board/extract-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      const data = await res.json()
      if (data.extraction) setExtraction(data.extraction)
    } catch {
      // fail silently
    } finally {
      setIsExtracting(false)
    }
  }

  const status = (doc.processing_status || '').toUpperCase()
  const isProcessing = status === 'UPLOADED' || status === 'PROCESSING'

  return (
    <div
      className="group rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-4 cursor-pointer transition-all hover:border-[#C8A97E]/40 hover:bg-[#131313] break-inside-avoid mb-4"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <span className="text-[#C8A97E] mt-0.5 shrink-0">
          <FileIcon mime={doc.mime_type} />
        </span>
        <span className="text-sm text-[#E5E5E5] truncate flex-1 min-w-0">{doc.title}</span>
        <StatusDot status={doc.processing_status} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(doc.id)
          }}
          className="text-[#666666] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Processing */}
      {isProcessing && <p className="mt-2 text-xs text-[#555555] animate-pulse">Processing...</p>}

      {/* Extracting */}
      {isExtracting && <p className="mt-2 text-xs text-[#C8A97E] animate-pulse">Manthan is reading...</p>}

      {/* Extraction data */}
      {extraction && !isExtracting && (
        <div className="mt-3 space-y-2.5">
          {/* Characters */}
          {extraction.characters && extraction.characters.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#555555]">Characters</span>
              <div className="flex flex-wrap gap-1">
                {extraction.characters.map((c) => (
                  <span
                    key={c.name}
                    className={`rounded-full px-2 py-0.5 text-[10px] border ${
                      c.role === 'protagonist'
                        ? 'border-[#C8A97E]/40 text-[#C8A97E] bg-[#C8A97E]/10'
                        : 'border-[#2A2A2A] text-[#E5E5E5] bg-[#1A1A1A]'
                    }`}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Themes */}
          {extraction.themes && extraction.themes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#555555]">Themes</span>
              <div className="flex flex-wrap gap-1">
                {extraction.themes.map((t) => (
                  <span key={t} className="rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-0.5 text-[10px] text-[#E5E5E5]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* World */}
          {(extraction.world?.location || extraction.world?.period) && (
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#555555]">World</span>
              <span className="block rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-0.5 text-[10px] text-[#E5E5E5] w-fit">
                {[extraction.world.location, extraction.world.period].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}

          {/* Tone */}
          {extraction.tone && (
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#555555]">Tone</span>
              <p className="text-[11px] text-[#666666] italic">{extraction.tone}</p>
            </div>
          )}

          {/* Summary */}
          {extraction.asset_summary && (
            <p className="text-[11px] text-[#666666] leading-relaxed line-clamp-2">{extraction.asset_summary}</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-[#444444]">
          <span>{formatFileSize(doc.file_size_bytes || 0)}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
        </div>
        <span className="text-[10px] text-[#C8A97E] opacity-0 group-hover:opacity-100 transition-opacity">
          View & Edit →
        </span>
      </div>
    </div>
  )
}
