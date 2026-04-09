'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/types/projects'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Image as ImageIcon, Loader2, MessageSquare, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'

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

const dimensionKeys = [
  { key: 'audience', label: 'Audience' },
  { key: 'themes', label: 'Themes' },
  { key: 'character', label: 'Character' },
  { key: 'world', label: 'World' },
  { key: 'stakes', label: 'Stakes' },
]

const typeStyles: Record<string, string> = {
  contradiction: 'border-[#FF4444]/30 bg-[#FF4444]/15 text-[#FF4444]',
  gap: 'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]',
  direction: 'border-[#C8A97E]/30 bg-[#C8A97E]/15 text-[#C8A97E]',
  enhancement: 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]',
  character: 'border-[#8B5CF6]/30 bg-[#8B5CF6]/15 text-[#8B5CF6]',
  structure: 'border-[#3B82F6]/30 bg-[#3B82F6]/15 text-[#3B82F6]',
}

interface BrainSidebarProps {
  projectId: string
  initialBrain: Brain
  initialSuggestions: Suggestion[]
  initialMessages: Message[]
  initialDocuments: AssetItem[]
  onAssetAdded?: () => Promise<void>
}

export function BrainSidebar({
  projectId,
  initialBrain,
  initialSuggestions,
  initialMessages,
  initialDocuments,
  onAssetAdded,
}: BrainSidebarProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const [brain, setBrain] = useState<Brain>(initialBrain)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [assets, setAssets] = useState<AssetItem[]>(initialDocuments)
  const [inputDraft, setInputDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)

  useEffect(() => { setAssets(initialDocuments) }, [initialDocuments])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const triggerAnalysis = useCallback(async () => {
    setAnalysing(true)
    try {
      const res = await fetch('/api/brain/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (data.brain) setBrain(data.brain)
      if (data.suggestions) setSuggestions(data.suggestions)
    } finally {
      setAnalysing(false)
    }
  }, [projectId])

  useEffect(() => {
    const handler = () => void triggerAnalysis()
    window.addEventListener('manthan-brain-updated', handler)
    window.addEventListener('manthan-brain-reanalyse', handler)
    return () => {
      window.removeEventListener('manthan-brain-updated', handler)
      window.removeEventListener('manthan-brain-reanalyse', handler)
    }
  }, [triggerAnalysis])

  const handleDismiss = async (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    await fetch('/api/brain/suggestions/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: id }),
    })
  }

  const sendMessage = async () => {
    const message = inputDraft.trim()
    if (!message || thinking) return
    setThinking(true)

    const writerMessage: Message = {
      id: `local-writer-${Date.now()}`,
      role: 'writer',
      content: message,
      message_type: 'chat',
      created_at: new Date().toISOString(),
    }
    const placeholderId = `local-assistant-${Date.now()}`
    const placeholder: Message = {
      id: placeholderId,
      role: 'manthan',
      content: 'Thinking...',
      message_type: 'chat',
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, writerMessage, placeholder])
    setInputDraft('')

    try {
      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message }),
      })
      const data = await res.json()
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: data.response || '...' } : m))
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: 'Could not send right now.' } : m))
      )
    } finally {
      setThinking(false)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Please log in.'); return }

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'bin'
        const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('creator-assets').upload(storagePath, file, {
          contentType: file.type,
        })
        if (uploadError) throw uploadError

        const publicUrl = supabase.storage.from('creator-assets').getPublicUrl(storagePath).data.publicUrl

        const { data: doc } = await supabase
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
          .select('id, title, asset_type, processing_status, file_size_bytes, created_at')
          .single()

        if (doc) setAssets((prev) => [doc as AssetItem, ...prev])

        await fetch('/api/inngest/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'document.uploaded',
            data: { documentId: doc?.id, userId: user.id, storagePath, fileName: file.name },
          }),
        })
      }

      await onAssetAdded?.()
      toast.success('Asset uploaded')
      router.refresh()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const activeSuggestions = useMemo(() => suggestions.filter((s) => s.status === 'active'), [suggestions])

  return (
    <div className="flex h-full flex-col bg-[#0D0D0D] border-l border-[#1A1A1A]">
      {/* Story Health */}
      <div className="border-b border-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Story Health</span>
          {analysing && <Loader2 className="h-3 w-3 animate-spin text-[#C8A97E]" />}
        </div>
        {brain?.last_analysed_at && (
          <p className="text-[10px] text-[#444444]">
            Last analysed {formatDistanceToNow(new Date(brain.last_analysed_at), { addSuffix: true })}
          </p>
        )}
        {brain?.known_dimensions ? (
          <div className="flex flex-wrap gap-1.5">
            {dimensionKeys.map((dim) => {
              const value = brain!.known_dimensions?.[dim.key] || ''
              const active = Boolean(value)
              return (
                <div
                  key={dim.key}
                  className={`rounded-full border px-2 py-0.5 text-[10px] truncate max-w-[140px] ${
                    active
                      ? 'border-[#C8A97E]/50 bg-[#C8A97E]/10 text-[#C8A97E]'
                      : 'border-[#222222] bg-[#111111] text-[#444444]'
                  }`}
                  title={value || 'Not defined'}
                >
                  {dim.label}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-[10px] text-[#444444]">Add content to see story health</p>
        )}
        {brain?.story_summary && (
          <p className="text-xs text-[#888888] leading-relaxed line-clamp-4">{brain.story_summary}</p>
        )}
      </div>

      {/* Observations */}
      {activeSuggestions.length > 0 && (
        <div className="border-b border-[#1A1A1A] p-4 space-y-2 max-h-60 overflow-y-auto">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Manthan&apos;s Observations</span>
          {activeSuggestions.map((s) => {
            const badgeStyle = typeStyles[s.suggestion_type] || typeStyles.direction
            const isExpanded = expandedSuggestion === s.id
            return (
              <div key={s.id} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-2.5 space-y-1.5">
                <button type="button" onClick={() => setExpandedSuggestion(isExpanded ? null : s.id)} className="w-full text-left">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`border text-[9px] capitalize px-1.5 py-0 ${badgeStyle}`}>{s.suggestion_type}</Badge>
                    <span className="text-xs text-[#E5E5E5] truncate flex-1">{s.title}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#888888] leading-relaxed whitespace-pre-wrap">{s.body}</p>
                    <button
                      type="button"
                      onClick={() => handleDismiss(s.id)}
                      className="text-[10px] text-[#555555] hover:text-[#E5E5E5]"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Chat */}
      <div className="flex flex-1 flex-col min-h-0">
        <div className="border-b border-[#1A1A1A] px-4 py-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E] flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" /> Chat
          </span>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {messages.length === 0 && (
              <p className="text-[11px] text-[#444444]">Ask Manthan anything about your story...</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'writer' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-[8px] px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'writer'
                      ? 'bg-[#1A1A1A] text-[#E5E5E5]'
                      : 'bg-[#111111] text-[#E5E5E5] border-l-2 border-l-[#C8A97E]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>
        <div className="border-t border-[#1A1A1A] p-3 flex gap-2">
          <input
            value={inputDraft}
            onChange={(e) => setInputDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask Manthan..."
            className="flex-1 rounded-[8px] border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
          />
          <Button
            size="sm"
            className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a] px-2"
            onClick={sendMessage}
            disabled={thinking}
          >
            {thinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Assets */}
      <div className="border-t border-[#1A1A1A] p-4 space-y-2 max-h-48 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Assets</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-[10px] text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
          >
            <Plus className="h-3 w-3" /> {uploading ? 'Uploading...' : 'Add'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.txt,.md"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
        {assets.length === 0 ? (
          <p className="text-[10px] text-[#444444]">No assets yet.</p>
        ) : (
          assets.map((a) => {
            const isImage = (a.asset_type || '').toUpperCase().includes('IMAGE')
            const status = (a.processing_status || '').toUpperCase()
            return (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <span className="text-[#555555]">
                  {isImage ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                </span>
                <span className="text-[11px] text-[#E5E5E5] truncate flex-1">{a.title}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status === 'EXTRACTION_FAILED'
                      ? 'bg-red-500'
                      : status === 'COMPLETED'
                        ? 'bg-[#C8A97E]'
                        : 'bg-[#555555] animate-pulse'
                  }`}
                />
                <span className="text-[9px] text-[#444444]">{formatFileSize(a.file_size_bytes || 0)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
