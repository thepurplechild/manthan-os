'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

type RefineProps = {
  onRefine: (note: string) => Promise<void> | void
  isRefining?: boolean
}

type BaseCardProps = {
  title: string
  onRegenerate: () => void
  isRefining?: boolean
} & RefineProps

type GenreTone = {
  primaryGenre?: string
  subGenres?: string[]
  tone?: string[]
}

function SectionLabel({ children }: { children: string }) {
  return <div className="text-[11px] uppercase tracking-[0.18em] text-[#C8A97E]">{children}</div>
}

function CardShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-4 space-y-4">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  )
}

function ActionRow({
  onCopy,
  onRegenerate,
  copyLabel = 'Copy',
  isRefining,
}: {
  onCopy: () => Promise<void>
  onRegenerate: () => void
  copyLabel?: string
  isRefining?: boolean
}) {
  return (
    <div className="flex gap-4">
      <Button
        size="sm"
        variant="ghost"
        className={`h-auto p-0 text-[#666666] hover:text-[#C8A97E] hover:bg-transparent ${isRefining ? 'animate-pulse text-[#C8A97E]' : ''}`}
        onClick={onRegenerate}
      >
        {isRefining ? 'Regenerating...' : 'Regenerate'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-auto p-0 text-[#666666] hover:text-[#C8A97E] hover:bg-transparent"
        onClick={onCopy}
      >
        <Copy className="h-4 w-4 mr-1" />
        {copyLabel}
      </Button>
    </div>
  )
}

function RefineRow({ onRefine, isRefining }: RefineProps) {
  const [note, setNote] = useState('')

  const submit = async () => {
    const trimmed = note.trim()
    if (!trimmed || isRefining) return
    await onRefine(trimmed)
    setNote('')
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. make the tone darker, add more conflict, the protagonist is actually a woman..."
        className="min-h-20 rounded-[8px] border-[#2A2A2A] bg-[#0A0A0A] text-white placeholder:text-[#666666] focus-visible:ring-0 focus-visible:border-[#C8A97E]/50"
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-auto p-0 text-[#C8A97E] hover:bg-transparent hover:underline"
        onClick={submit}
        disabled={isRefining}
      >
        {isRefining ? 'Refining...' : 'Apply'}
      </Button>
    </div>
  )
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Copied')
}

export function formatOnePagerAsText(content: unknown): string {
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content !== null) {
    const c = content as Record<string, unknown>
    const sections: string[] = []
    if (c.title) sections.push(`${String(c.title)}\n`)
    if (c.logline) sections.push(`LOGLINE\n${String(c.logline)}`)
    if (c.synopsis) sections.push(`SYNOPSIS\n${String(c.synopsis)}`)
    if (c.genre) sections.push(`GENRE\n${String(c.genre)}`)
    if (c.characters) sections.push(`CHARACTERS\n${JSON.stringify(c.characters, null, 2)}`)
    return sections.join('\n\n---\n\n')
  }
  return JSON.stringify(content, null, 2)
}

export function LoglineCard({ content, onRegenerate, onRefine, isRefining }: { content: string } & BaseCardProps) {
  return (
    <CardShell title="LOGLINE">
      <div className="border-l-2 border-l-[#C8A97E] pl-4 text-[#E5E5E5] text-[1.1rem] font-light leading-[1.8]">{content}</div>
      <ActionRow onCopy={() => copyText(content)} onRegenerate={onRegenerate} isRefining={isRefining} />
      <RefineRow onRefine={onRefine} isRefining={isRefining} />
    </CardShell>
  )
}

export function SynopsisCard({ content, onRegenerate, onRefine, isRefining }: { content: string } & BaseCardProps) {
  return (
    <CardShell title="SYNOPSIS">
      <div className="text-[#E5E5E5] text-[0.9rem] leading-[1.8] whitespace-pre-wrap">{content}</div>
      <ActionRow onCopy={() => copyText(content)} onRegenerate={onRegenerate} isRefining={isRefining} />
      <RefineRow onRefine={onRefine} isRefining={isRefining} />
    </CardShell>
  )
}

export function GenreToneCard({
  content,
  onRegenerate,
  onRefine,
  isRefining,
}: {
  content: GenreTone
} & BaseCardProps) {
  return (
    <CardShell title="GENRE + TONE">
      <div className="space-y-3">
        {content.primaryGenre && <div className="text-[#C8A97E] text-lg font-light">{content.primaryGenre}</div>}
        {content.subGenres && content.subGenres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {content.subGenres.map((item) => (
              <Badge key={item} className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#E5E5E5] rounded-[8px]">
                {item}
              </Badge>
            ))}
          </div>
        )}
        {content.tone && content.tone.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {content.tone.map((item) => (
              <Badge key={item} className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#E5E5E5] rounded-[8px]">
                {item}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <ActionRow onCopy={() => copyText(JSON.stringify(content, null, 2))} onRegenerate={onRegenerate} isRefining={isRefining} />
      <RefineRow onRefine={onRefine} isRefining={isRefining} />
    </CardShell>
  )
}

export function CharacterCard({
  content,
  onRegenerate,
  onRefine,
  isRefining,
}: {
  content: unknown
} & BaseCardProps) {
  const parsed = useMemo(() => {
    if (typeof content === 'string') return { kind: 'string' as const, value: content }
    if (content && typeof content === 'object') {
      const record = content as Record<string, unknown>
      if (Array.isArray(record.characters)) return { kind: 'characters' as const, value: record.characters }
      return { kind: 'object' as const, value: record }
    }
    return { kind: 'other' as const, value: content }
  }, [content])

  return (
    <CardShell title="CHARACTER BREAKDOWN">
      {parsed.kind === 'characters' ? (
        <div className="space-y-3">
          {parsed.value.map((character, idx) => {
            const c = (character || {}) as Record<string, unknown>
            const roleText = c.role || c.type ? String(c.role || c.type) : ''
            const motivationText = c.motivation ? String(c.motivation) : ''
            const arcText = c.arc || c.characterArc ? String(c.arc || c.characterArc) : ''
            return (
              <div key={`${String(c.name || 'character')}-${idx}`} className="rounded-[8px] border border-[#2A2A2A] bg-[#0F0F0F] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-[#C8A97E] text-sm uppercase tracking-[0.1em]">{String(c.name || c.character || `Character ${idx + 1}`)}</div>
                  {roleText && (
                    <Badge className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#E5E5E5] rounded-[8px]">{roleText}</Badge>
                  )}
                </div>
                {motivationText && <div className="text-[#E5E5E5] text-sm leading-[1.8]">Motivation: {motivationText}</div>}
                {arcText && (
                  <div className="text-[#E5E5E5] text-sm leading-[1.8]">Arc: {arcText}</div>
                )}
              </div>
            )
          })}
        </div>
      ) : parsed.kind === 'string' ? (
        <div className="text-[#E5E5E5] text-[0.9rem] leading-[1.8] whitespace-pre-wrap">{parsed.value}</div>
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-[1.8] text-[#E5E5E5] bg-[#0A0A0A] border border-[#2A2A2A] rounded-[8px] p-3">
          {JSON.stringify(parsed.value, null, 2)}
        </pre>
      )}
      <ActionRow onCopy={() => copyText(JSON.stringify(content, null, 2))} onRegenerate={onRegenerate} isRefining={isRefining} />
      <RefineRow onRefine={onRefine} isRefining={isRefining} />
    </CardShell>
  )
}

export function OnePagerCard({
  content,
  onRegenerate,
  onRefine,
  isRefining,
}: {
  content: unknown
} & BaseCardProps) {
  const asObject = content && typeof content === 'object' ? (content as Record<string, unknown>) : null
  const textVersion = formatOnePagerAsText(content)
  const titleText = asObject?.title ? String(asObject.title) : ''
  const loglineText = asObject?.logline ? String(asObject.logline) : ''
  const synopsisText = asObject?.synopsis ? String(asObject.synopsis) : ''
  const genreToneText =
    asObject && (asObject.genre || asObject.genreAndTone || asObject.tone)
      ? String(asObject.genre || JSON.stringify(asObject.genreAndTone || asObject.tone, null, 2))
      : ''
  const hasCharacters = Boolean(asObject?.characters)

  return (
    <CardShell title="ONE-PAGER">
      {typeof content === 'string' ? (
        <div className="text-[#E5E5E5] text-[0.9rem] leading-[1.8] whitespace-pre-wrap">{content}</div>
      ) : asObject ? (
        <div className="space-y-3">
          {titleText && <div className="text-[#C8A97E] text-xl font-light">{titleText}</div>}
          {loglineText && (
            <>
              <div className="h-px bg-[#1A1A1A]" />
              <SectionLabel>Logline</SectionLabel>
              <div className="text-[#E5E5E5] text-sm leading-[1.8] whitespace-pre-wrap">{loglineText}</div>
            </>
          )}
          {synopsisText && (
            <>
              <div className="h-px bg-[#1A1A1A]" />
              <SectionLabel>Synopsis</SectionLabel>
              <div className="text-[#E5E5E5] text-sm leading-[1.8] whitespace-pre-wrap">{synopsisText}</div>
            </>
          )}
          {genreToneText && (
            <>
              <div className="h-px bg-[#1A1A1A]" />
              <SectionLabel>Genre & Tone</SectionLabel>
              <div className="text-[#E5E5E5] text-sm leading-[1.8] whitespace-pre-wrap">{genreToneText}</div>
            </>
          )}
          {hasCharacters && (
            <>
              <div className="h-px bg-[#1A1A1A]" />
              <SectionLabel>Key Characters</SectionLabel>
              <pre className="whitespace-pre-wrap text-sm leading-[1.8] text-[#E5E5E5] bg-[#0A0A0A] border border-[#2A2A2A] rounded-[8px] p-3">
                {JSON.stringify(asObject.characters, null, 2)}
              </pre>
            </>
          )}
          {!titleText && !loglineText && !synopsisText && !genreToneText && !hasCharacters && (
            <pre className="whitespace-pre-wrap text-sm leading-[1.8] text-[#E5E5E5] bg-[#0A0A0A] border border-[#2A2A2A] rounded-[8px] p-3">
              {JSON.stringify(asObject, null, 2)}
            </pre>
          )}
        </div>
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-[1.8] text-[#E5E5E5] bg-[#0A0A0A] border border-[#2A2A2A] rounded-[8px] p-3">
          {JSON.stringify(content, null, 2)}
        </pre>
      )}
      <ActionRow onCopy={() => copyText(textVersion)} onRegenerate={onRegenerate} copyLabel="Copy full one-pager" isRefining={isRefining} />
      <RefineRow onRefine={onRefine} isRefining={isRefining} />
    </CardShell>
  )
}
