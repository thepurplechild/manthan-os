'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Download, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import type { DocumentItem } from './AssetCard'

interface AssetExtraction {
  characters?: Array<{ name: string; role: string; description: string; want?: string; wound?: string }>
  themes?: string[]
  world?: { location?: string; period?: string; social_context?: string }
  tone?: string
  asset_summary?: string
  gaps?: string[]
}

interface AssetCardModalProps {
  document: DocumentItem
  onClose: () => void
}

export function AssetCardModal({ document: doc, onClose }: AssetCardModalProps) {
  const [extraction, setExtraction] = useState<AssetExtraction | null>((doc.asset_metadata as AssetExtraction | null) || null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])
  const [chatThinking, setChatThinking] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  useEffect(() => {
    if (!extraction && !isExtracting) {
      setIsExtracting(true)
      fetch('/api/board/extract-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.extraction) setExtraction(data.extraction)
        })
        .finally(() => setIsExtracting(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = useCallback(
    (path: string, value: unknown) => {
      setExtraction((prev) => {
        if (!prev) return prev
        const copy = JSON.parse(JSON.stringify(prev)) as Record<string, unknown>
        const keys = path.split('.')
        let obj: Record<string, unknown> = copy
        for (let i = 0; i < keys.length - 1; i++) {
          obj = obj[keys[i]] as Record<string, unknown>
        }
        obj[keys[keys.length - 1]] = value
        return copy as AssetExtraction
      })
      setDirty(true)
    },
    []
  )

  const saveChanges = async () => {
    if (!extraction) return
    const supabase = createClient()
    await supabase.from('documents').update({ asset_metadata: extraction }).eq('id', doc.id)
    setDirty(false)
    toast.success('Changes saved')
  }

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || chatThinking) return
    setChatThinking(true)
    setChatMessages((prev) => [...prev, { role: 'writer', content: msg }])
    setChatInput('')

    try {
      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: null, message: `Regarding asset "${doc.title}":\n${msg}` }),
      })
      const data = await res.json()
      setChatMessages((prev) => [...prev, { role: 'manthan', content: data.response || '...' }])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'manthan', content: 'Could not respond right now.' }])
    } finally {
      setChatThinking(false)
    }
  }

  const removeTheme = (index: number) => {
    if (!extraction?.themes) return
    const next = extraction.themes.filter((_, i) => i !== index)
    updateField('themes', next)
  }

  const addTheme = () => {
    const next = [...(extraction?.themes || []), '']
    updateField('themes', next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl rounded-[12px] border border-[#1E1E1E] bg-[#111111] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 text-[#666666] hover:text-[#E5E5E5]">
          <X className="h-5 w-5" />
        </button>

        {/* Left: Asset Content */}
        <div className="flex w-[55%] flex-col border-r border-[#1A1A1A]">
          <div className="border-b border-[#1A1A1A] px-5 py-4">
            <h2 className="text-lg font-light text-[#E5E5E5] pr-8">{doc.title}</h2>
            {doc.storage_url && (
              <a
                href={doc.storage_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-[#C8A97E] hover:text-[#E5E5E5]"
              >
                <Download className="h-3 w-3" /> Download original
              </a>
            )}
          </div>
          <ScrollArea className="flex-1 p-5">
            {doc.mime_type?.startsWith('image/') && doc.storage_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.storage_url} alt={doc.title} className="w-full rounded-[8px]" />
            ) : doc.extracted_text ? (
              <pre className="whitespace-pre-wrap text-sm text-[#E5E5E5] leading-relaxed font-sans">
                {doc.extracted_text}
              </pre>
            ) : (
              <p className="text-sm text-[#555555]">
                {doc.mime_type?.startsWith('audio/') || doc.mime_type?.startsWith('video/')
                  ? 'Audio/video preview not available. Download the original file.'
                  : 'Content not yet available.'}
              </p>
            )}
          </ScrollArea>
        </div>

        {/* Right: Extraction */}
        <div className="flex w-[45%] flex-col">
          <ScrollArea className="flex-1 p-5">
            {isExtracting ? (
              <div className="flex items-center gap-2 text-sm text-[#C8A97E] animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" /> Manthan is reading this asset...
              </div>
            ) : !extraction ? (
              <p className="text-sm text-[#555555]">No extraction available.</p>
            ) : (
              <div className="space-y-5">
                {/* Summary */}
                {extraction.asset_summary && (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Asset Summary</label>
                    <p className="text-sm text-[#E5E5E5] leading-relaxed">{extraction.asset_summary}</p>
                  </div>
                )}

                {/* Characters */}
                {extraction.characters && extraction.characters.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Characters</label>
                    {extraction.characters.map((c, i) => (
                      <div key={`${c.name}-${i}`} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={c.name}
                            onChange={(e) => updateField(`characters.${i}.name`, e.target.value)}
                            className="flex-1 bg-transparent text-sm text-[#E5E5E5] focus:outline-none"
                          />
                          <select
                            value={c.role}
                            onChange={(e) => updateField(`characters.${i}.role`, e.target.value)}
                            className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-0.5 text-[10px] text-[#E5E5E5] focus:outline-none"
                          >
                            <option value="protagonist">Protagonist</option>
                            <option value="antagonist">Antagonist</option>
                            <option value="supporting">Supporting</option>
                            <option value="minor">Minor</option>
                          </select>
                        </div>
                        <textarea
                          value={c.description}
                          onChange={(e) => updateField(`characters.${i}.description`, e.target.value)}
                          placeholder="Description"
                          rows={2}
                          className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
                        />
                        <input
                          value={c.want || ''}
                          onChange={(e) => updateField(`characters.${i}.want`, e.target.value)}
                          placeholder="Want"
                          className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                        />
                        <input
                          value={c.wound || ''}
                          onChange={(e) => updateField(`characters.${i}.wound`, e.target.value)}
                          placeholder="Wound"
                          className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Themes */}
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Themes</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(extraction.themes || []).map((t, i) => (
                      <div key={`theme-${i}`} className="flex items-center gap-1 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-0.5">
                        <input
                          value={t}
                          onChange={(e) => {
                            const next = [...(extraction.themes || [])]
                            next[i] = e.target.value
                            updateField('themes', next)
                          }}
                          className="bg-transparent text-[10px] text-[#E5E5E5] w-24 focus:outline-none"
                        />
                        <button type="button" onClick={() => removeTheme(i)} className="text-[#555555] hover:text-[#EF4444]">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTheme}
                      className="rounded-full border border-dashed border-[#2A2A2A] px-2 py-0.5 text-[10px] text-[#555555] hover:text-[#C8A97E] hover:border-[#C8A97E]/40"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* World */}
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">World</label>
                  <input
                    value={extraction.world?.location || ''}
                    onChange={(e) => updateField('world.location', e.target.value)}
                    placeholder="Location"
                    className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                  />
                  <input
                    value={extraction.world?.period || ''}
                    onChange={(e) => updateField('world.period', e.target.value)}
                    placeholder="Period"
                    className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                  />
                  <textarea
                    value={extraction.world?.social_context || ''}
                    onChange={(e) => updateField('world.social_context', e.target.value)}
                    placeholder="Social context"
                    rows={2}
                    className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
                  />
                </div>

                {/* Gaps */}
                {extraction.gaps && extraction.gaps.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Manthan Noticed</label>
                    {extraction.gaps.map((gap, i) => (
                      <div key={`gap-${i}`} className="rounded-[8px] border-l-2 border-l-[#F59E0B] bg-[#1A1A1A] px-3 py-2 text-xs text-[#888888] leading-relaxed">
                        {gap}
                      </div>
                    ))}
                  </div>
                )}

                {/* Save */}
                {dirty && (
                  <Button
                    onClick={saveChanges}
                    className="w-full bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a]"
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            )}

            {/* Chat */}
            <div className="mt-6 space-y-2 border-t border-[#1A1A1A] pt-4">
              <label className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Ask Manthan</label>
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-[8px] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'writer'
                      ? 'bg-[#1A1A1A] text-[#E5E5E5] ml-6'
                      : 'bg-[#0A0A0A] text-[#E5E5E5] border-l-2 border-l-[#C8A97E] mr-6'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder="Ask about this asset..."
                  className="flex-1 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                />
                <Button size="sm" className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a] px-2" onClick={sendChat} disabled={chatThinking}>
                  {chatThinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
