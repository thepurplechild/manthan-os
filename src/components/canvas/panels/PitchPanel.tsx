'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Megaphone, Copy, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'

interface OutputRecord {
  id: string
  output_type: string
  content: unknown
  created_at: string
}

interface PitchPanelProps {
  projectId: string
  outputs: OutputRecord[]
  isVisible: boolean
  onToggle: () => void
  onRegenerateAll?: () => Promise<void>
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Copied')
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content, null, 2)
  }
  return String(content ?? '')
}

function OutputSection({ label, content }: { label: string; content: unknown }) {
  const text = extractText(content)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">{label}</span>
        <button
          type="button"
          onClick={() => copyText(text)}
          className="flex items-center gap-1 text-[10px] text-[#555555] hover:text-[#C8A97E] transition-colors"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <div className="text-sm text-[#E5E5E5] leading-[1.8] whitespace-pre-wrap">{text}</div>
    </div>
  )
}

export function PitchPanel({ projectId, outputs, isVisible, onToggle, onRegenerateAll }: PitchPanelProps) {
  const [regenerating, setRegenerating] = useState(false)

  const latestByType = useMemo(() => {
    return outputs.reduce<Record<string, OutputRecord>>((acc, o) => {
      if (!acc[o.output_type]) acc[o.output_type] = o
      return acc
    }, {})
  }, [outputs])

  const loglineRaw = latestByType.LOGLINES?.content as { loglines?: Array<{ text?: string }> } | string | undefined
  const logline = typeof loglineRaw === 'string' ? loglineRaw : loglineRaw?.loglines?.find((l) => l?.text)?.text || ''
  const synopsisRaw = latestByType.SYNOPSIS?.content as { long?: string; short?: string } | string | undefined
  const synopsis = typeof synopsisRaw === 'string' ? synopsisRaw : synopsisRaw?.long || synopsisRaw?.short || ''
  const characterBreakdown = latestByType.CHARACTER_BIBLE?.content ?? null
  const onePager = latestByType.ONE_PAGER?.content ?? null

  const hasOutputs = Boolean(logline || synopsis || characterBreakdown || onePager)

  const handleRegenerate = async () => {
    if (!onRegenerateAll || regenerating) return
    setRegenerating(true)
    try {
      await onRegenerateAll()
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <CanvasPanel
      id="pitch"
      title="Pitch Package"
      icon={<Megaphone className="h-4 w-4" />}
      isVisible={isVisible}
      onToggle={onToggle}
      defaultWidth="full"
      healthStatus={hasOutputs ? 'complete' : null}
    >
      <div className="space-y-4">
        {onRegenerateAll && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-sm text-[#C8A97E] hover:text-[#E5E5E5] transition-colors disabled:opacity-50"
          >
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {regenerating ? 'Regenerating...' : 'Regenerate All'}
          </button>
        )}

        {!hasOutputs ? (
          <p className="text-sm text-[#555555]">No outputs yet. Add content and let Manthan generate your pitch package.</p>
        ) : (
          <div className="space-y-5">
            {logline && <OutputSection label="Logline" content={logline} />}
            {synopsis && <OutputSection label="Synopsis" content={synopsis} />}
            {characterBreakdown && <OutputSection label="Character Breakdown" content={characterBreakdown} />}
            {onePager && <OutputSection label="One-Pager" content={onePager} />}
          </div>
        )}

        <Link
          href={`/dashboard/new?projectId=${projectId}`}
          className="inline-block text-sm text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
        >
          Continue conversation →
        </Link>
      </div>
    </CanvasPanel>
  )
}
