'use client'

import { useCallback, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  BookOpen,
  Users,
  Globe,
  Layers,
  Sparkles,
  Bookmark,
  Megaphone,
} from 'lucide-react'

import { generateLoglines } from '@/app/actions/loglines'
import { generateSynopsis } from '@/app/actions/synopsis'
import { generateCharacterBible } from '@/app/actions/characterBible'
import { generateOnePager } from '@/app/actions/onePager'

import { StoryCorePanel } from '@/components/canvas/panels/StoryCorePanel'
import { CharactersPanel } from '@/components/canvas/panels/CharactersPanel'
import { WorldPanel } from '@/components/canvas/panels/WorldPanel'
import { StructurePanel } from '@/components/canvas/panels/StructurePanel'
import { ThemesPanel } from '@/components/canvas/panels/ThemesPanel'
import { ReferencesPanel } from '@/components/canvas/panels/ReferencesPanel'
import { PitchPanel } from '@/components/canvas/panels/PitchPanel'
import { BrainSidebar } from '@/components/canvas/BrainSidebar'

type OutputRecord = {
  id: string
  output_type: string
  content: unknown
  created_at: string
}

type Brain = {
  story_summary: string
  known_dimensions: Record<string, string>
  identified_gaps: string[]
  contradictions: unknown[]
  synthesised_context: string
  last_analysed_at: string
} | null

type Suggestion = {
  id: string
  suggestion_type: string
  title: string
  body: string
  options: string[]
  status: string
}

type Message = {
  id: string
  role: string
  content: string
  message_type: string
  created_at: string
}

type AssetItem = {
  id: string
  title: string
  asset_type: string
  processing_status: string
  file_size_bytes: number
  created_at: string
}

interface StoryCanvasProps {
  projectId: string
  projectTitle: string
  projectDescription: string
  initialBrain: Brain
  initialSuggestions: Suggestion[]
  initialMessages: Message[]
  initialDocuments: AssetItem[]
  initialOutputs: OutputRecord[]
  onAssetAdded?: () => Promise<void>
}

const allPanels = [
  { id: 'story-core', label: 'Story Core', icon: BookOpen },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'world', label: 'World', icon: Globe },
  { id: 'structure', label: 'Structure', icon: Layers },
  { id: 'themes', label: 'Themes', icon: Sparkles },
  { id: 'references', label: 'References', icon: Bookmark },
  { id: 'pitch', label: 'Pitch', icon: Megaphone },
] as const

const defaultVisible = new Set(['story-core', 'characters', 'pitch'])

export function StoryCanvas({
  projectId,
  projectTitle,
  projectDescription,
  initialBrain,
  initialSuggestions,
  initialMessages,
  initialDocuments,
  initialOutputs,
  onAssetAdded,
}: StoryCanvasProps) {
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(defaultVisible)
  const [outputs, setOutputs] = useState<OutputRecord[]>(initialOutputs)

  const toggle = useCallback((id: string) => {
    setVisiblePanels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const logline = useMemo(() => {
    const loglineRec = outputs.find((o) => o.output_type === 'LOGLINES')
    if (!loglineRec) return ''
    const raw = loglineRec.content as { loglines?: Array<{ text?: string }> } | string
    return typeof raw === 'string' ? raw : raw?.loglines?.find((l) => l?.text)?.text || ''
  }, [outputs])

  const handleRegenerateAll = useCallback(async () => {
    const supabase = createClient()
    const { data: docs } = await supabase
      .from('documents')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)

    const primaryDocId = docs?.[0]?.id
    if (!primaryDocId) {
      toast.error('No document to regenerate from.')
      return
    }

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
        .eq('id', primaryDocId)
    }

    await supabase.from('script_analysis_outputs').delete().eq('document_id', primaryDocId)

    await generateLoglines(primaryDocId)
    await generateSynopsis(primaryDocId)
    await generateCharacterBible(primaryDocId)
    await generateOnePager(primaryDocId)

    const { data: freshOutputs } = await supabase
      .from('script_analysis_outputs')
      .select('id, output_type, content, created_at')
      .eq('document_id', primaryDocId)
      .eq('status', 'GENERATED')
      .order('created_at', { ascending: false })

    if (freshOutputs) setOutputs(freshOutputs as OutputRecord[])
    window.dispatchEvent(new CustomEvent('manthan-outputs-regenerated'))
    toast.success('Pitch package regenerated')
  }, [projectId])

  const handleRegenerateLogline = useCallback(async () => {
    const supabase = createClient()
    const { data: docs } = await supabase
      .from('documents')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)

    const docId = docs?.[0]?.id
    if (!docId) return

    await generateLoglines(docId)

    const { data: fresh } = await supabase
      .from('script_analysis_outputs')
      .select('id, output_type, content, created_at')
      .eq('document_id', docId)
      .eq('status', 'GENERATED')
      .order('created_at', { ascending: false })

    if (fresh) setOutputs(fresh as OutputRecord[])
  }, [projectId])

  return (
    <div className="flex h-full bg-[#0A0A0A]">
      {/* LEFT: Canvas area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Toggle bar */}
        <div className="flex items-center gap-2 border-b border-[#1A1A1A] px-6 py-3 overflow-x-auto shrink-0">
          {allPanels.map((p) => {
            const active = visiblePanels.has(p.id)
            const Icon = p.icon
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#C8A97E]/40 text-[#C8A97E]'
                    : 'border-[#222222] text-[#444444] hover:border-[#333333] hover:text-[#666666]'
                }`}
              >
                <Icon className="h-3 w-3" />
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Panels */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <StoryCorePanel
              projectId={projectId}
              initialDescription={projectDescription}
              logline={logline}
              isVisible={visiblePanels.has('story-core')}
              onToggle={() => toggle('story-core')}
              onRegenerateLogline={handleRegenerateLogline}
            />
            <CharactersPanel
              projectId={projectId}
              isVisible={visiblePanels.has('characters')}
              onToggle={() => toggle('characters')}
            />
            <WorldPanel
              projectId={projectId}
              isVisible={visiblePanels.has('world')}
              onToggle={() => toggle('world')}
            />
            <StructurePanel
              projectId={projectId}
              isVisible={visiblePanels.has('structure')}
              onToggle={() => toggle('structure')}
            />
            <ThemesPanel
              projectId={projectId}
              isVisible={visiblePanels.has('themes')}
              onToggle={() => toggle('themes')}
            />
            <ReferencesPanel
              projectId={projectId}
              isVisible={visiblePanels.has('references')}
              onToggle={() => toggle('references')}
            />
            <PitchPanel
              projectId={projectId}
              outputs={outputs}
              isVisible={visiblePanels.has('pitch')}
              onToggle={() => toggle('pitch')}
              onRegenerateAll={handleRegenerateAll}
            />
          </div>
        </div>
      </div>

      {/* RIGHT: Brain sidebar — hidden on mobile, shown as bottom drawer via CSS */}
      <div className="hidden lg:flex w-80 shrink-0">
        <BrainSidebar
          projectId={projectId}
          initialBrain={initialBrain}
          initialSuggestions={initialSuggestions}
          initialMessages={initialMessages}
          initialDocuments={initialDocuments}
          onAssetAdded={onAssetAdded}
        />
      </div>

      {/* Mobile brain drawer */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50">
        <MobileBrainDrawer
          projectId={projectId}
          initialBrain={initialBrain}
          initialSuggestions={initialSuggestions}
          initialMessages={initialMessages}
          initialDocuments={initialDocuments}
          onAssetAdded={onAssetAdded}
        />
      </div>
    </div>
  )
}

function MobileBrainDrawer(props: Omit<StoryCanvasProps, 'projectTitle' | 'projectDescription' | 'initialOutputs'> & { onAssetAdded?: () => Promise<void> }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-[#111111] border-t border-[#1A1A1A] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[#C8A97E] text-center"
      >
        {open ? 'Close Brain' : 'Open Manthan Brain'}
      </button>
      {open && (
        <div className="h-[60vh] overflow-hidden bg-[#0D0D0D]">
          <BrainSidebar {...props} />
        </div>
      )}
    </>
  )
}
