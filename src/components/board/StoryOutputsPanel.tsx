'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, ChevronDown, ChevronRight, Loader2, MessageSquare, RefreshCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

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

interface StoryOutputsPanelProps {
  projectId: string
  brain: Brain
  suggestions: Suggestion[]
  initialMessages: Message[]
  outputs: StoryOutputs
  onReanalyse: () => Promise<void>
}

const dimensionKeys = ['audience', 'themes', 'character', 'world', 'stakes']
const dimensionLabels: Record<string, string> = {
  audience: 'Audience',
  themes: 'Themes',
  character: 'Character',
  world: 'World',
  stakes: 'Stakes',
}

const typeStyles: Record<string, string> = {
  contradiction: 'border-[#FF4444]/30 bg-[#FF4444]/15 text-[#FF4444]',
  gap: 'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]',
  direction: 'border-[#C8A97E]/30 bg-[#C8A97E]/15 text-[#C8A97E]',
  enhancement: 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]',
  character: 'border-[#8B5CF6]/30 bg-[#8B5CF6]/15 text-[#8B5CF6]',
  structure: 'border-[#3B82F6]/30 bg-[#3B82F6]/15 text-[#3B82F6]',
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Copied')
}

function extractCharacters(cb: unknown): Array<{ name: string; role?: string; arc?: string }> {
  if (!cb) return []
  if (typeof cb === 'object' && cb !== null) {
    const record = cb as Record<string, unknown>
    if (Array.isArray(record.characters)) {
      return record.characters.map((c: Record<string, unknown>) => ({
        name: String(c.name || c.character || 'Unknown'),
        role: c.role ? String(c.role) : undefined,
        arc: (c.arc || c.characterArc) ? String(c.arc || c.characterArc) : undefined,
      }))
    }
  }
  return []
}

export function StoryOutputsPanel({
  projectId,
  brain,
  suggestions: initialSuggestions,
  initialMessages,
  outputs,
  onReanalyse,
}: StoryOutputsPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [chatInput, setChatInput] = useState('')
  const [chatThinking, setChatThinking] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [reanalysing, setReanalysing] = useState(false)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatOpen])

  const handleDismiss = async (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    await fetch('/api/brain/suggestions/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: id }),
    })
  }

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || chatThinking) return
    setChatThinking(true)

    const writerMsg: Message = {
      id: `w-${Date.now()}`,
      role: 'writer',
      content: msg,
      message_type: 'chat',
      created_at: new Date().toISOString(),
    }
    const placeholderId = `m-${Date.now()}`
    const placeholder: Message = {
      id: placeholderId,
      role: 'manthan',
      content: 'Thinking...',
      message_type: 'chat',
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, writerMsg, placeholder])
    setChatInput('')

    try {
      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message: msg }),
      })
      const data = await res.json()
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: data.response || '...' } : m)))
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: 'Could not respond.' } : m)))
    } finally {
      setChatThinking(false)
    }
  }

  const handleReanalyse = useCallback(async () => {
    setReanalysing(true)
    try {
      await onReanalyse()
    } finally {
      setReanalysing(false)
    }
  }, [onReanalyse])

  const activeSuggestions = suggestions.filter((s) => s.status === 'active')
  const firstQuestion = activeSuggestions[0]
  const characters = extractCharacters(outputs.characterBreakdown)

  return (
    <div className="flex h-full flex-col bg-[#0D0D0D] border-l border-[#1A1A1A] overflow-y-auto">
      {/* Story Health */}
      <div className="border-b border-[#1A1A1A] p-4 space-y-3">
        <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Story Health</span>
        {brain ? (
          <>
            {brain.story_summary && (
              <div>
                <p className={`text-xs text-[#888888] leading-relaxed ${summaryExpanded ? '' : 'line-clamp-3'}`}>
                  {brain.story_summary}
                </p>
                {brain.story_summary.length > 200 && (
                  <button
                    type="button"
                    onClick={() => setSummaryExpanded((o) => !o)}
                    className="text-[10px] text-[#C8A97E] hover:text-[#E5E5E5] mt-1"
                  >
                    {summaryExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {dimensionKeys.map((key) => {
                const value = brain.known_dimensions?.[key]
                const active = Boolean(value)
                return (
                  <span
                    key={key}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      active
                        ? 'border-[#C8A97E]/50 bg-[#C8A97E]/10 text-[#C8A97E]'
                        : 'border-[#222222] bg-[#111111] text-[#333333]'
                    }`}
                  >
                    {dimensionLabels[key]}
                  </span>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-[#444444]">Add assets to see story health</p>
        )}
      </div>

      {/* First suggestion as question */}
      {firstQuestion && (
        <div className="border-b border-[#1A1A1A] p-4 space-y-2">
          <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Manthan&apos;s Next Question</span>
          <div className="rounded-[8px] border-l-2 border-l-[#C8A97E] bg-[#0A0A0A] p-3">
            <Badge className={`border text-[9px] capitalize mb-1 ${typeStyles[firstQuestion.suggestion_type] || typeStyles.direction}`}>
              {firstQuestion.suggestion_type}
            </Badge>
            <p className="text-sm text-[#E5E5E5]">{firstQuestion.title}</p>
            {expandedSuggestion === firstQuestion.id && (
              <p className="text-xs text-[#888888] mt-1 leading-relaxed whitespace-pre-wrap">{firstQuestion.body}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setExpandedSuggestion(expandedSuggestion === firstQuestion.id ? null : firstQuestion.id)}
                className="text-[10px] text-[#C8A97E] hover:text-[#E5E5E5]"
              >
                {expandedSuggestion === firstQuestion.id ? 'Less' : 'More'}
              </button>
              <button type="button" onClick={() => handleDismiss(firstQuestion.id)} className="text-[10px] text-[#555555] hover:text-[#888888]">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logline */}
      {outputs.logline && (
        <div className="border-b border-[#1A1A1A] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Logline</span>
            <button type="button" onClick={() => copyText(outputs.logline!)} className="text-[#555555] hover:text-[#C8A97E]">
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <p className="border-l-2 border-l-[#C8A97E] pl-3 text-sm text-[#E5E5E5] font-light leading-[1.8]">{outputs.logline}</p>
        </div>
      )}

      {/* Synopsis */}
      {outputs.synopsis && (
        <div className="border-b border-[#1A1A1A] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Synopsis</span>
            <button type="button" onClick={() => copyText(outputs.synopsis!)} className="text-[#555555] hover:text-[#C8A97E]">
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <p className={`text-xs text-[#E5E5E5] leading-relaxed whitespace-pre-wrap ${synopsisExpanded ? '' : 'line-clamp-4'}`}>
            {outputs.synopsis}
          </p>
          <button
            type="button"
            onClick={() => setSynopsisExpanded((o) => !o)}
            className="text-[10px] text-[#C8A97E] hover:text-[#E5E5E5]"
          >
            {synopsisExpanded ? 'Collapse' : 'Read more'}
          </button>
        </div>
      )}

      {/* Characters */}
      {characters.length > 0 && (
        <div className="border-b border-[#1A1A1A] p-4 space-y-2">
          <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Characters</span>
          {characters.map((c) => (
            <div key={c.name} className="flex items-center gap-2 py-1">
              <span className="text-xs text-[#C8A97E]">{c.name}</span>
              {c.role && (
                <Badge className="border border-[#2A2A2A] bg-[#1A1A1A] text-[9px] text-[#888888] capitalize">{c.role}</Badge>
              )}
              {c.arc && <span className="text-[10px] text-[#555555] truncate flex-1">{c.arc}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Themes from brain */}
      {brain?.known_dimensions?.themes && (
        <div className="border-b border-[#1A1A1A] p-4 space-y-2">
          <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Themes</span>
          <p className="text-xs text-[#E5E5E5]">{brain.known_dimensions.themes}</p>
        </div>
      )}

      {/* Generate Full Pitch */}
      <div className="border-b border-[#1A1A1A] p-4">
        <Button
          onClick={handleReanalyse}
          disabled={reanalysing}
          className="w-full bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a]"
        >
          {reanalysing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" /> Generate Full Pitch →
            </>
          )}
        </Button>
      </div>

      {/* Chat */}
      <div className="p-4 space-y-2">
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-[#C8A97E] hover:text-[#E5E5E5]"
        >
          <MessageSquare className="h-3 w-3" />
          Ask Manthan anything
          {chatOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {chatOpen && (
          <div className="space-y-2">
            <ScrollArea className="max-h-60">
              <div className="space-y-2 pr-2">
                {messages.length === 0 && <p className="text-[10px] text-[#444444]">Ask about your story...</p>}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-[8px] px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                      m.role === 'writer'
                        ? 'bg-[#1A1A1A] text-[#E5E5E5] ml-4'
                        : 'bg-[#0A0A0A] text-[#E5E5E5] border-l-2 border-l-[#C8A97E] mr-4'
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2">
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

      {/* Re-analyse link */}
      <div className="p-4 pt-0">
        <button
          type="button"
          onClick={handleReanalyse}
          disabled={reanalysing}
          className="text-[10px] text-[#555555] hover:text-[#C8A97E] transition-colors"
        >
          Re-analyse with Manthan
        </button>
      </div>
    </div>
  )
}
