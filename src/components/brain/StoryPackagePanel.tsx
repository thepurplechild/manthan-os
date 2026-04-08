'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LoglineCard, SynopsisCard, GenreToneCard, CharacterCard, OnePagerCard } from '@/components/story/OutputCards'
import { generateCharacterBible } from '@/app/actions/characterBible'
import { generateLoglines } from '@/app/actions/loglines'
import { generateOnePager } from '@/app/actions/onePager'
import { generateSynopsis } from '@/app/actions/synopsis'

type OutputRecord = {
  id: string
  output_type: string
  content: unknown
  created_at: string
}

interface StoryPackagePanelProps {
  projectId: string
  documentIds: string[]
}

export function StoryPackagePanel({ projectId, documentIds }: StoryPackagePanelProps) {
  const supabase = createClient()
  const [outputs, setOutputs] = useState<OutputRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const fetchOutputs = async () => {
    if (documentIds.length === 0) {
      setOutputs([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('script_analysis_outputs')
      .select('*')
      .in('document_id', documentIds)
      .eq('status', 'GENERATED')
      .order('created_at', { ascending: false })
    setOutputs((data || []) as OutputRecord[])
    setLoading(false)
  }

  useEffect(() => {
    void fetchOutputs()
  }, [documentIds.join(',')])

  const latestByType = useMemo(() => {
    return outputs.reduce<Record<string, OutputRecord>>((acc, output) => {
      if (!acc[output.output_type]) acc[output.output_type] = output
      return acc
    }, {})
  }, [outputs])

  const loglineRaw = latestByType.LOGLINES?.content as { loglines?: Array<{ text?: string }> } | string | undefined
  const logline = typeof loglineRaw === 'string' ? loglineRaw : loglineRaw?.loglines?.find((line) => line?.text)?.text || ''
  const synopsisRaw = latestByType.SYNOPSIS?.content as { long?: string; short?: string; tweet?: string } | string | undefined
  const synopsis = typeof synopsisRaw === 'string' ? synopsisRaw : synopsisRaw?.long || synopsisRaw?.short || synopsisRaw?.tweet || ''
  const genreTone = (latestByType.GENRE_CLASSIFICATION?.content || null) as { primaryGenre?: string; subGenres?: string[]; tone?: string[] } | null
  const characterBreakdown = latestByType.CHARACTER_BIBLE?.content ?? null
  const onePager = latestByType.ONE_PAGER?.content ?? null

  const handleRegenerateAll = async () => {
    const primaryDocumentId = documentIds[0]
    if (!primaryDocumentId) {
      toast.error('No document available to regenerate.')
      return
    }
    setRegenerating(true)
    try {
      const { data: brain } = await supabase
        .from('project_brain')
        .select('synthesised_context')
        .eq('project_id', projectId)
        .single()

      if (brain?.synthesised_context) {
        await supabase
          .from('documents')
          .update({
            extracted_text: brain.synthesised_context,
            file_size_bytes: brain.synthesised_context.length,
          })
          .eq('id', primaryDocumentId)
      }

      await generateLoglines(primaryDocumentId)
      await generateSynopsis(primaryDocumentId)
      await generateCharacterBible(primaryDocumentId)
      await generateOnePager(primaryDocumentId)
      await fetchOutputs()
      toast.success('Story package regenerated')
    } catch (error) {
      console.error('Regenerate all failed:', error)
      toast.error('Could not regenerate outputs')
    } finally {
      setRegenerating(false)
    }
  }

  const noOp = () => {
    toast.info('Use Regenerate All for this project view.')
  }
  const noRefine = async (_note: string) => {
    toast.info('Continue in New Story to refine outputs.')
  }

  return (
    <div className="h-full bg-[#0D0D0D] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#C8A97E]">Story Package</div>
        <Button
          size="sm"
          variant="ghost"
          className="text-[#C8A97E] hover:bg-transparent hover:text-[#E5E5E5]"
          onClick={handleRegenerateAll}
          disabled={regenerating || documentIds.length === 0}
        >
          {regenerating ? 'Regenerating...' : 'Regenerate All'}
        </Button>
      </div>

      <Button asChild variant="ghost" className="h-auto p-0 text-[#C8A97E] hover:bg-transparent hover:underline">
        <Link href={`/dashboard/new?projectId=${projectId}`}>Continue in New Story -&gt;</Link>
      </Button>

      {loading ? (
        <div className="text-sm text-[#666666]">Loading story package...</div>
      ) : !logline && !synopsis && !genreTone && !characterBreakdown && !onePager ? (
        <div className="text-sm text-[#666666]">No outputs yet. Start a conversation to generate your story package.</div>
      ) : (
        <div className="space-y-4">
          {logline && <LoglineCard title="LOGLINE" content={logline} onRegenerate={noOp} onRefine={noRefine} />}
          {genreTone && <GenreToneCard title="GENRE + TONE" content={genreTone} onRegenerate={noOp} onRefine={noRefine} />}
          {characterBreakdown && (
            <CharacterCard title="CHARACTER BREAKDOWN" content={characterBreakdown} onRegenerate={noOp} onRefine={noRefine} />
          )}
          {synopsis && <SynopsisCard title="SYNOPSIS" content={synopsis} onRegenerate={noOp} onRefine={noRefine} />}
          {onePager && <OnePagerCard title="ONE-PAGER" content={onePager} onRegenerate={noOp} onRefine={noRefine} />}
        </div>
      )}
    </div>
  )
}
