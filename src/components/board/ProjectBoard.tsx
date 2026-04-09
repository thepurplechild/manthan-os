'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MapPin, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { DropZone } from '@/components/board/DropZone'
import { AssetCard, type DocumentItem } from '@/components/board/AssetCard'
import { AssetCardModal } from '@/components/board/AssetCardModal'
import { StoryOutputsPanel } from '@/components/board/StoryOutputsPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ProjectWorld } from '@/app/actions/projectWorld'

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
  projectDescription: string
  initialDocuments: DocumentItem[]
  initialBrain: Brain
  initialSuggestions: Suggestion[]
  initialMessages: Message[]
  initialOutputs: StoryOutputs
  initialWorld: ProjectWorld | null
}

const typeStyles: Record<string, string> = {
  contradiction: 'border-l-[#EF4444]',
  gap: 'border-l-[#F59E0B]',
  direction: 'border-l-[#C8A97E]',
  enhancement: 'border-l-[#10B981]',
  character: 'border-l-[#8B5CF6]',
  structure: 'border-l-[#3B82F6]',
}

const dimensionKeys = ['audience', 'themes', 'character', 'world', 'stakes']
const dimensionLabels: Record<string, string> = {
  audience: 'Audience',
  themes: 'Themes',
  character: 'Character',
  world: 'World',
  stakes: 'Stakes',
}

function extractCharactersFromDocs(docs: DocumentItem[]): Array<{ name: string; role?: string; arc?: string }> {
  const seen = new Set<string>()
  const result: Array<{ name: string; role?: string; arc?: string }> = []
  for (const doc of docs) {
    const meta = doc.asset_metadata as Record<string, unknown> | null
    if (meta && Array.isArray(meta.characters)) {
      for (const c of meta.characters as Array<Record<string, unknown>>) {
        const name = String(c.name || '')
        if (name && !seen.has(name)) {
          seen.add(name)
          result.push({
            name,
            role: c.role ? String(c.role) : undefined,
            arc: (c.arc || c.description) ? String(c.arc || c.description) : undefined,
          })
        }
      }
    }
  }
  return result
}

function extractLocationsFromDocs(docs: DocumentItem[]): Array<{ name: string }> {
  const seen = new Set<string>()
  const result: Array<{ name: string }> = []
  for (const doc of docs) {
    const meta = doc.asset_metadata as Record<string, unknown> | null
    if (meta?.world && typeof meta.world === 'object') {
      const w = meta.world as Record<string, unknown>
      const loc = w.location ? String(w.location) : ''
      if (loc && !seen.has(loc)) {
        seen.add(loc)
        result.push({ name: loc })
      }
    }
  }
  return result
}

function extractTimeContext(docs: DocumentItem[]): string {
  for (const doc of docs) {
    const meta = doc.asset_metadata as Record<string, unknown> | null
    if (meta?.world && typeof meta.world === 'object') {
      const w = meta.world as Record<string, unknown>
      return [w.period, w.social_context].filter(Boolean).map(String).join(' · ')
    }
  }
  return ''
}

export function ProjectBoard({
  projectId,
  projectTitle: initialTitle,
  projectDescription: initialDescription,
  initialDocuments,
  initialBrain,
  initialSuggestions,
  initialMessages,
  initialOutputs,
  initialWorld,
}: ProjectBoardProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [brain, setBrain] = useState<Brain>(initialBrain)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [outputs, setOutputs] = useState<StoryOutputs>(initialOutputs)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const [title, setTitle] = useState(initialTitle)
  const [editingTitle, setEditingTitle] = useState(false)
  const [premise, setPremise] = useState(initialDescription)
  const [centralQuestion, setCentralQuestion] = useState(initialWorld?.central_question || '')
  const [themeStatement, setThemeStatement] = useState(initialWorld?.theme_statement || '')

  const [rightTab, setRightTab] = useState<'insights' | 'outputs' | 'chat'>('insights')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Message[]>(initialMessages)
  const [chatThinking, setChatThinking] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (rightTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, rightTab])

  useEffect(() => {
    return () => {
      pollingRef.current.forEach((interval) => clearInterval(interval))
    }
  }, [])

  const saveTitle = async () => {
    setEditingTitle(false)
    const supabase = createClient()
    await supabase.from('projects').update({ title }).eq('id', projectId)
  }

  const savePremise = async () => {
    const supabase = createClient()
    await supabase.from('projects').update({ description: premise }).eq('id', projectId)
  }

  const saveWorldField = async (field: string, value: string) => {
    try {
      const { updateProjectWorld } = await import('@/app/actions/projectWorld')
      await updateProjectWorld(projectId, { [field]: value })
    } catch {
      // project_world may not exist
    }
  }

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
        setDocuments((prev) => prev.map((d) => (d.id === documentId ? (data as DocumentItem) : d)))
        const status = (data.processing_status || '').toUpperCase()
        if (status === 'READY' || status === 'COMPLETED' || status === 'EXTRACTION_FAILED') {
          clearInterval(interval)
          pollingRef.current.delete(documentId)
          if (status !== 'EXTRACTION_FAILED') void triggerReanalysis()
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
      }
    } catch (err) {
      console.error('Reanalysis failed:', err)
    } finally {
      setIsAnalysing(false)
    }
  }, [projectId])

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || chatThinking) return
    setChatThinking(true)
    const writerMsg: Message = { id: `w-${Date.now()}`, role: 'writer', content: msg, message_type: 'chat', created_at: new Date().toISOString() }
    const placeholderId = `m-${Date.now()}`
    const placeholder: Message = { id: placeholderId, role: 'manthan', content: 'Thinking...', message_type: 'chat', created_at: new Date().toISOString() }
    setChatMessages((prev) => [...prev, writerMsg, placeholder])
    setChatInput('')
    try {
      const res = await fetch('/api/brain/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, message: msg }) })
      const data = await res.json()
      setChatMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: data.response || '...' } : m)))
    } catch {
      setChatMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: 'Could not respond.' } : m)))
    } finally {
      setChatThinking(false)
    }
  }

  const handleDismiss = async (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    await fetch('/api/brain/suggestions/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestionId: id }) })
  }

  const uniqueDocs = documents.filter((doc, i, self) => i === self.findIndex((d) => d.id === doc.id))
  const worldCharacters = extractCharactersFromDocs(uniqueDocs)
  const worldLocations = extractLocationsFromDocs(uniqueDocs)
  const worldTimeContext = extractTimeContext(uniqueDocs)
  const activeSuggestions = suggestions.filter((s) => s.status === 'active')

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E5E5E5] overflow-hidden">
      {/* Left: Board */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-[#161616] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/dashboard" className="text-sm text-[#555555] hover:text-[#E5E5E5] transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4 inline mr-1" />Projects
            </Link>
            <span className="text-[#333333]">/</span>
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle() }}
                className="bg-transparent text-sm text-[#E5E5E5] font-light focus:outline-none border-b border-[#C8A97E]/50 min-w-[200px]"
              />
            ) : (
              <button type="button" onClick={() => setEditingTitle(true)} className="text-sm text-[#E5E5E5] font-light truncate hover:text-[#C8A97E] transition-colors">
                {title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isAnalysing && (
              <div className="flex items-center gap-1.5 text-xs text-[#C8A97E]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing...
              </div>
            )}
            <button type="button" onClick={() => void triggerReanalysis()} className="text-[11px] text-[#555555] hover:text-[#C8A97E] transition-colors">
              Re-analyse
            </button>
            <Link
              href={`/dashboard/projects/${projectId}/pitch`}
              className="bg-[#C8A97E] text-[#0A0A0A] font-medium text-[13px] px-4 py-2 rounded-[4px] hover:brightness-110 transition"
            >
              Pitch →
            </Link>
          </div>
        </div>

        {/* Scrollable board */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-4xl space-y-10">

            {/* Section 1: Your Story */}
            <section>
              <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em] font-medium">Your Story</span>
              <div className="mt-4 rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-6 space-y-5">
                <div>
                  <label className="text-[9px] text-[#C8A97E] uppercase tracking-[0.15em]">Premise</label>
                  <textarea
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    onBlur={savePremise}
                    placeholder="What is this story about? Write anything."
                    className="mt-2 w-full bg-transparent text-sm text-[#E5E5E5] leading-[1.7] placeholder:text-[#444444] focus:outline-none resize-none min-h-[60px]"
                  />
                </div>

                {outputs.logline && (
                  <div>
                    <label className="text-[9px] text-[#C8A97E] uppercase tracking-[0.15em]">Logline</label>
                    <p className="mt-2 text-base font-light leading-[1.8] text-[#E5E5E5] border-l-2 border-[#C8A97E] pl-3">
                      {outputs.logline}
                    </p>
                    <button type="button" onClick={() => void triggerReanalysis()} className="text-[11px] text-[#555555] hover:text-[#C8A97E] mt-1">
                      Regenerate
                    </button>
                  </div>
                )}

                <div>
                  <label className="text-[9px] text-[#C8A97E] uppercase tracking-[0.15em]">The Question This Story Asks</label>
                  <input
                    value={centralQuestion}
                    onChange={(e) => setCentralQuestion(e.target.value)}
                    onBlur={() => saveWorldField('central_question', centralQuestion)}
                    placeholder="e.g. Can a man unlearn the cowardice that defined his youth?"
                    className="mt-2 w-full bg-transparent text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none border-b border-transparent focus:border-[#1E1E1E]"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-[#C8A97E] uppercase tracking-[0.15em]">Theme</label>
                  <input
                    value={themeStatement}
                    onChange={(e) => setThemeStatement(e.target.value)}
                    onBlur={() => saveWorldField('theme_statement', themeStatement)}
                    placeholder="e.g. Love requires betrayal of what you were taught"
                    className="mt-2 w-full bg-transparent text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none border-b border-transparent focus:border-[#1E1E1E]"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Your Assets */}
            <section>
              <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em] font-medium">Your Assets</span>
              <div className="mt-4">
                {uniqueDocs.length === 0 ? (
                  <DropZone projectId={projectId} onUploadComplete={handleUploadComplete} hasAssets={false} />
                ) : (
                  <div className="space-y-4">
                    <div className="columns-1 md:columns-2 gap-4">
                      {uniqueDocs.map((doc) => (
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
            </section>

            {/* Section 3: Your World */}
            <section className="pb-12">
              <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em] font-medium">Your World</span>
              <div className="mt-4 space-y-6">
                {/* Characters */}
                <div>
                  <span className="text-[10px] text-[#666666] uppercase tracking-wider">Characters</span>
                  {worldCharacters.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {worldCharacters.map((c) => (
                        <div key={c.name} className="flex items-center gap-2 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#C8A97E] shrink-0" />
                          <span className="text-sm text-[#C8A97E]">{c.name}</span>
                          {c.role && (
                            <Badge className="border border-[#2A2A2A] bg-[#1A1A1A] text-[9px] text-[#888888] capitalize">{c.role}</Badge>
                          )}
                          {c.arc && <span className="text-[11px] text-[#555555] truncate flex-1">Arc: {c.arc}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[#444444]">Add assets to discover characters</p>
                  )}
                </div>

                {/* Locations */}
                <div>
                  <span className="text-[10px] text-[#666666] uppercase tracking-wider">Locations</span>
                  {worldLocations.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {worldLocations.map((l) => (
                        <div key={l.name} className="flex items-center gap-2 py-1">
                          <MapPin className="h-3 w-3 text-[#555555] shrink-0" />
                          <span className="text-sm text-[#E5E5E5]">{l.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[#444444]">No locations found yet</p>
                  )}
                </div>

                {/* Time & Context */}
                <div>
                  <span className="text-[10px] text-[#666666] uppercase tracking-wider">Time & Context</span>
                  {worldTimeContext ? (
                    <p className="mt-2 text-sm text-[#E5E5E5]">{worldTimeContext}</p>
                  ) : (
                    <p className="mt-2 text-xs text-[#444444]">Not identified yet</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Right: Manthan Panel */}
      <div className="hidden lg:flex w-[360px] shrink-0 flex-col bg-[#0D0D0D] border-l border-[#161616] overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#161616] px-5 shrink-0">
          {(['insights', 'outputs', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRightTab(tab)}
              className={`px-3 py-3 text-[12px] uppercase tracking-[0.12em] transition-colors ${
                rightTab === tab ? 'text-[#C8A97E] border-b-2 border-[#C8A97E]' : 'text-[#555555] hover:text-[#888888]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {rightTab === 'insights' && (
            <div className="p-5 space-y-5">
              {/* Story Health */}
              <div className="space-y-3">
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Story Health</span>
                {brain?.story_summary && (
                  <p className="text-[13px] text-[#888888] leading-relaxed line-clamp-3">{brain.story_summary}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {dimensionKeys.map((key) => {
                    const active = Boolean(brain?.known_dimensions?.[key])
                    return (
                      <span key={key} className={`rounded-full border px-2 py-0.5 text-[10px] ${active ? 'border-[#C8A97E]/50 bg-[#C8A97E]/10 text-[#C8A97E]' : 'border-[#222222] bg-[#111111] text-[#333333]'}`}>
                        {dimensionLabels[key]}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-3">
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Manthan&apos;s Observations</span>
                {activeSuggestions.length === 0 ? (
                  <p className="text-xs text-[#444444]">No observations yet — add assets to get started</p>
                ) : (
                  activeSuggestions.map((s) => (
                    <div key={s.id} className={`rounded-[8px] border-l-4 ${typeStyles[s.suggestion_type] || typeStyles.direction} bg-[#111111] p-3 space-y-2`}>
                      <div className="flex items-center gap-2">
                        <Badge className="border border-[#2A2A2A] bg-transparent text-[9px] capitalize text-[#888888]">{s.suggestion_type}</Badge>
                        <span className="text-sm text-[#E5E5E5] font-medium">{s.title}</span>
                      </div>
                      <p className="text-xs text-[#888888] leading-relaxed line-clamp-2">{s.body}</p>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setRightTab('chat')} className="text-[10px] text-[#C8A97E] hover:text-[#E5E5E5]">
                          Address →
                        </button>
                        <button type="button" onClick={() => handleDismiss(s.id)} className="text-[10px] text-[#555555] hover:text-[#888888]">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {rightTab === 'outputs' && (
            <StoryOutputsPanel
              projectId={projectId}
              projectTitle={title}
              brain={brain}
              suggestions={suggestions}
              initialMessages={chatMessages}
              outputs={outputs}
              onReanalyse={triggerReanalysis}
            />
          )}

          {rightTab === 'chat' && (
            <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 p-5">
                <div className="space-y-3">
                  {chatMessages.length === 0 && <p className="text-xs text-[#444444]">Ask Manthan about your story...</p>}
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-[8px] px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${
                        m.role === 'writer'
                          ? 'bg-[#1A1A1A] text-[#E5E5E5] ml-6'
                          : 'border-l-2 border-l-[#C8A97E] text-[#E5E5E5] mr-6'
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-[#161616] flex gap-2 shrink-0">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder="Ask Manthan..."
                  className="flex-1 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                />
                <Button size="sm" className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a] px-2" onClick={sendChat} disabled={chatThinking}>
                  {chatThinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        projectId={projectId}
        projectTitle={title}
        brain={brain}
        suggestions={suggestions}
        initialMessages={chatMessages}
        outputs={outputs}
        onReanalyse={triggerReanalysis}
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

function MobileDrawer(props: {
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
        className="w-full bg-[#111111] border-t border-[#161616] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[#C8A97E] text-center"
      >
        {open ? 'Close' : 'View Story & Outputs'}
      </button>
      {open && (
        <div className="h-[60vh] overflow-hidden">
          <StoryOutputsPanel {...props} />
        </div>
      )}
    </div>
  )
}
