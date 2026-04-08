'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SuggestionCard } from '@/components/brain/SuggestionCard'
import { generateLoglines } from '@/app/actions/loglines'
import { generateSynopsis } from '@/app/actions/synopsis'
import { generateCharacterBible } from '@/app/actions/characterBible'
import { generateOnePager } from '@/app/actions/onePager'

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

interface BrainPanelProps {
  projectId: string
  initialBrain: Brain
  initialSuggestions: Suggestion[]
  initialMessages: Message[]
  onOutputsRegenerated?: () => Promise<void> | void
}

export function BrainPanel({
  projectId,
  initialBrain,
  initialSuggestions,
  initialMessages,
  onOutputsRegenerated
}: BrainPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [brain, setBrain] = useState<Brain>(initialBrain)
  const [inputDraft, setInputDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [updatingOutputs, setUpdatingOutputs] = useState(false)

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
      if (data.primaryDocumentId) {
        setUpdatingOutputs(true)
        await generateLoglines(data.primaryDocumentId)
        await generateSynopsis(data.primaryDocumentId)
        await generateCharacterBible(data.primaryDocumentId)
        await generateOnePager(data.primaryDocumentId)
        await onOutputsRegenerated?.()
        window.dispatchEvent(new CustomEvent('manthan-outputs-regenerated'))
        setUpdatingOutputs(false)
      }
    } finally {
      setUpdatingOutputs(false)
      setAnalysing(false)
    }
  }, [onOutputsRegenerated, projectId])

  useEffect(() => {
    const staleMs = 15 * 60 * 1000
    const isStale = !brain?.last_analysed_at || Date.now() - new Date(brain.last_analysed_at).getTime() > staleMs
    if (!brain || isStale) {
      void triggerAnalysis()
    }
  }, [brain, triggerAnalysis])

  useEffect(() => {
    const onBrainUpdated = () => {
      void triggerAnalysis()
    }
    window.addEventListener('manthan-brain-updated', onBrainUpdated)
    window.addEventListener('manthan-brain-reanalyse', onBrainUpdated)
    return () => {
      window.removeEventListener('manthan-brain-updated', onBrainUpdated)
      window.removeEventListener('manthan-brain-reanalyse', onBrainUpdated)
    }
  }, [triggerAnalysis])

  const dimensions = useMemo(
    () => [
      { key: 'audience', label: 'Audience' },
      { key: 'themes', label: 'Themes' },
      { key: 'character', label: 'Character' },
      { key: 'world', label: 'World' },
      { key: 'stakes', label: 'Stakes' },
    ],
    []
  )

  const handleDismiss = async (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    await fetch('/api/brain/suggestions/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: id }),
    })
  }

  const handleApply = async (id: string, note: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    await fetch('/api/brain/suggestions/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId: id, note }),
    })
    await triggerAnalysis()
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
    const placeholderAssistantId = `local-assistant-${Date.now()}`
    const placeholderAssistant: Message = {
      id: placeholderAssistantId,
      role: 'manthan',
      content: 'Thinking...',
      message_type: 'chat',
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, writerMessage, placeholderAssistant])
    setInputDraft('')

    try {
      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message }),
      })
      const data = await res.json()
      setMessages((prev) =>
        prev.map((msg) => (msg.id === placeholderAssistantId ? { ...msg, content: data.response || '...' } : msg))
      )
    } catch {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === placeholderAssistantId ? { ...msg, content: 'Could not send right now.' } : msg))
      )
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <div className="border-b border-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-[0.18em] uppercase text-[#C8A97E]">Manthan Brain</div>
          <Button variant="ghost" className="text-[#C8A97E] hover:bg-transparent hover:text-[#E5E5E5]" onClick={triggerAnalysis}>
            Re-analyse
          </Button>
        </div>
        {brain?.last_analysed_at && (
          <div className="text-xs text-[#555555]">
            Last analysed {formatDistanceToNow(new Date(brain.last_analysed_at), { addSuffix: true })}
          </div>
        )}
        {analysing && <div className="text-xs text-[#C8A97E] animate-pulse">Manthan is reading your assets...</div>}
        {updatingOutputs && <div className="text-xs text-[#C8A97E] animate-pulse">Manthan is updating story package...</div>}

        {brain?.story_summary && (
          <div className="rounded-[8px] border border-[#1A1A1A] bg-[#0D0D0D] p-3 space-y-2">
            <div className="text-[11px] tracking-[0.18em] uppercase text-[#C8A97E]">Story Summary</div>
            <p className="text-sm text-[#E5E5E5] leading-relaxed">{brain.story_summary}</p>
          </div>
        )}

        {brain?.known_dimensions && (
          <div className="flex flex-wrap gap-2">
            {dimensions.map((dimension) => {
              const value = brain.known_dimensions?.[dimension.key] || ''
              const active = Boolean(value)
              return (
                <div
                  key={dimension.key}
                  className={`rounded-full border px-3 py-1 text-xs max-w-[180px] truncate ${
                    active ? 'border-[#C8A97E]/50 bg-[#C8A97E]/10 text-[#C8A97E]' : 'border-[#333333] bg-[#111111] text-[#555555]'
                  }`}
                  title={value || 'Not defined'}
                >
                  {dimension.label}: {value || '—'}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-b border-[#1A1A1A] p-4">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#C8A97E] mb-3">Manthan&apos;s Observations</div>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {suggestions.filter((s) => s.status === 'active').length === 0 ? (
            <div className="text-sm text-[#666666]">No active suggestions yet.</div>
          ) : (
            suggestions
              .filter((s) => s.status === 'active')
              .map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} onDismiss={handleDismiss} onApply={handleApply} />
              ))
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-sm text-[#666666]">Ask Manthan anything about your story...</div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'writer' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-[8px] px-4 py-3 text-sm whitespace-pre-wrap ${
                    message.role === 'writer'
                      ? 'bg-[#1A1A1A] text-[#E5E5E5]'
                      : 'bg-[#111111] text-[#E5E5E5] border-l-2 border-l-[#C8A97E]'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-[#1A1A1A] p-4 space-y-3">
        <Textarea
          value={inputDraft}
          onChange={(e) => setInputDraft(e.target.value)}
          placeholder="Ask anything - about your characters, structure, themes, directions..."
          className="min-h-24 rounded-[8px] border-[#2A2A2A] bg-[#111111] text-[#E5E5E5] placeholder:text-[#666666] focus-visible:ring-0 focus-visible:border-[#C8A97E]/40"
        />
        <div className="flex justify-end">
          <Button className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a]" onClick={sendMessage} disabled={thinking}>
            {thinking ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
