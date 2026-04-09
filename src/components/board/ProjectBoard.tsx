'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { DropZone } from '@/components/board/DropZone'
import { AssetCard, type DocumentItem } from '@/components/board/AssetCard'
import { AssetCardModal } from '@/components/board/AssetCardModal'
import { ManthanQuestion } from '@/components/board/ManthanQuestion'
import { StoryOutputsPanel } from '@/components/board/StoryOutputsPanel'

type Brain = {
  story_summary: string
  known_dimensions: Record<string, string>
  identified_gaps: string[]
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

interface StoryOutputs {
  logline?: string
  synopsis?: string
  characterBreakdown?: unknown
  genreTone?: unknown
  onePager?: unknown
}

interface ProjectBoardProps {
  projectId: string
  projectTitle: string
  initialDocuments: DocumentItem[]
  initialBrain: Brain
  initialSuggestions: Suggestion[]
  initialMessages: Message[]
  initialOutputs: StoryOutputs
}

export function ProjectBoard({
  projectId,
  projectTitle,
  initialDocuments,
  initialBrain,
  initialSuggestions,
  initialMessages,
  initialOutputs,
}: ProjectBoardProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [brain, setBrain] = useState<Brain>(initialBrain)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [outputs, setOutputs] = useState<StoryOutputs>(initialOutputs)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    return () => {
      pollingRef.current.forEach((interval) => clearInterval(interval))
    }
  }, [])

  useEffect(() => {
    const gapSuggestion = suggestions.find((s) => s.status === 'active' && s.suggestion_type === 'gap')
    if (gapSuggestion && !pendingQuestion) {
      setPendingQuestion(gapSuggestion.title)
    }
  }, [suggestions, pendingQuestion])

  const pollDocumentStatus = useCallback(
    (documentId: string) => {
      const supabase = createClient()
      let elapsed = 0
      const interval = setInterval(async () => {
        elapsed += 3000
        if (elapsed > 60000) {
          clearInterval(interval)
          pollingRef.current.delete(documentId)
          return
        }

        const { data } = await supabase
          .from('documents')
          .select('id, title, asset_type, processing_status, file_size_bytes, mime_type, asset_metadata, created_at, extracted_text, storage_url')
          .eq('id', documentId)
          .single()

        if (!data) return

        setDocuments((prev) =>
          prev.map((d) => (d.id === documentId ? (data as DocumentItem) : d))
        )

        const status = (data.processing_status || '').toUpperCase()
        if (status === 'READY' || status === 'COMPLETED' || status === 'EXTRACTION_FAILED') {
          clearInterval(interval)
          pollingRef.current.delete(documentId)

          if (status !== 'EXTRACTION_FAILED') {
            void triggerReanalysis()
          }
        }
      }, 3000)

      pollingRef.current.set(documentId, interval)
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleUploadComplete = useCallback(
    (documentId: string) => {
      const supabase = createClient()
      supabase
        .from('documents')
        .select('id, title, asset_type, processing_status, file_size_bytes, mime_type, asset_metadata, created_at, extracted_text, storage_url')
        .eq('id', documentId)
        .single()
        .then(({ data }) => {
          if (data) {
            setDocuments((prev) => {
              if (prev.some((d) => d.id === documentId)) return prev
              return [data as DocumentItem, ...prev]
            })
          }
        })

      pollDocumentStatus(documentId)
    },
    [pollDocumentStatus]
  )

  const handleDeleteDocument = useCallback(async (documentId: string) => {
    const supabase = createClient()
    await supabase.from('documents').delete().eq('id', documentId)
    setDocuments((prev) => prev.filter((d) => d.id !== documentId))
  }, [])

  const triggerReanalysis = useCallback(async () => {
    setIsAnalysing(true)
    try {
      const brainRes = await fetch('/api/brain/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const brainData = await brainRes.json()
      if (brainData.brain) setBrain(brainData.brain)
      if (brainData.suggestions) setSuggestions(brainData.suggestions)

      if (brainData.primaryDocumentId) {
        const [
          { generateLoglines },
          { generateSynopsis },
          { generateCharacterBible },
          { generateOnePager },
        ] = await Promise.all([
          import('@/app/actions/loglines'),
          import('@/app/actions/synopsis'),
          import('@/app/actions/characterBible'),
          import('@/app/actions/onePager'),
        ])

        const [loglineRes, synopsisRes, charRes, onePagerRes] = await Promise.all([
          generateLoglines(brainData.primaryDocumentId),
          generateSynopsis(brainData.primaryDocumentId),
          generateCharacterBible(brainData.primaryDocumentId),
          generateOnePager(brainData.primaryDocumentId),
        ])

        setOutputs((prev) => ({
          ...prev,
          logline: loglineRes.data?.loglines?.[0]?.text ?? prev.logline,
          synopsis: synopsisRes.data?.short ?? synopsisRes.data?.long ?? prev.synopsis,
          characterBreakdown: charRes.data ?? prev.characterBreakdown,
          onePager: onePagerRes.data ?? prev.onePager,
          genreTone: onePagerRes.data?.genreAndTone ?? prev.genreTone,
        }))

        window.dispatchEvent(new CustomEvent('manthan-outputs-regenerated'))
      }
    } catch (err) {
      console.error('Reanalysis failed:', err)
    } finally {
      setIsAnalysing(false)
    }
  }, [projectId])

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E5E5E5] overflow-hidden">
      {/* Left: Board */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#1A1A1A] px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center text-sm text-[#C8A97E] hover:text-[#E5E5E5] shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Projects
              </Link>
              <h1 className="text-lg font-light text-[#E5E5E5] truncate">{projectTitle}</h1>
            </div>
            {isAnalysing && (
              <div className="flex items-center gap-2 text-xs text-[#C8A97E] shrink-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analysing...
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-[#444444] italic">Drop files to build your story — click any card to view and edit</p>
        </div>

        {/* Board area */}
        <div className="flex-1 overflow-y-auto p-6">
          {documents.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <DropZone projectId={projectId} onUploadComplete={handleUploadComplete} hasAssets={false} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="columns-1 md:columns-2 gap-4">
                {documents
                  .filter((doc, index, self) => index === self.findIndex((d) => d.id === doc.id))
                  .map((doc) => (
                  <AssetCard
                    key={doc.id}
                    document={doc}
                    onDelete={handleDeleteDocument}
                    onClick={() => setSelectedDocument(doc)}
                  />
                ))}
              </div>
              <DropZone projectId={projectId} onUploadComplete={handleUploadComplete} hasAssets={true} />
            </div>
          )}
        </div>
      </div>

      {/* Right: Outputs panel — hidden on mobile */}
      <div className="hidden lg:flex w-96 shrink-0">
        <StoryOutputsPanel
          projectId={projectId}
          projectTitle={projectTitle}
          brain={brain}
          suggestions={suggestions}
          initialMessages={initialMessages}
          outputs={outputs}
          onReanalyse={triggerReanalysis}
        />
      </div>

      {/* Mobile outputs toggle */}
      <MobileOutputsDrawer
        projectId={projectId}
        projectTitle={projectTitle}
        brain={brain}
        suggestions={suggestions}
        initialMessages={initialMessages}
        outputs={outputs}
        onReanalyse={triggerReanalysis}
      />

      {/* Manthan question */}
      <ManthanQuestion
        question={pendingQuestion}
        onDismiss={() => setPendingQuestion(null)}
        onAnswer={() => {
          setPendingQuestion(null)
          setChatOpenGlobally()
        }}
      />

      {/* Modal */}
      {selectedDocument && (
        <AssetCardModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onSave={(extraction) => {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === selectedDocument.id ? { ...d, asset_metadata: extraction } : d
              )
            )
          }}
        />
      )}
    </div>
  )
}

function setChatOpenGlobally() {
  window.dispatchEvent(new CustomEvent('manthan-open-chat'))
}

function MobileOutputsDrawer(props: {
  projectId: string
  projectTitle: string
  brain: Brain
  suggestions: Suggestion[]
  initialMessages: Message[]
  outputs: StoryOutputs
  onReanalyse: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-[#111111] border-t border-[#1A1A1A] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[#C8A97E] text-center"
      >
        {open ? 'Close Story Panel' : 'View Story & Outputs'}
      </button>
      {open && (
        <div className="h-[60vh] overflow-hidden">
          <StoryOutputsPanel {...props} />
        </div>
      )}
    </div>
  )
}
