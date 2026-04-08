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

function CardShell({ title, children, isRefining }: { title: string; children: ReactNode; isRefining?: boolean }) {
  return (
    <div className={`rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-4 space-y-4 ${isRefining ? 'animate-pulse' : ''}`}>
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

function RefineRow({
  onRefine,
  isRefining,
  placeholder,
}: RefineProps & {
  placeholder: string
}) {
  const [note, setNote] = useState('')

  const submit = async () => {
    const trimmed = note.trim()
    if (!trimmed || isRefining) return
    await onRefine(trimmed)
    setNote('')
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-[#888888]">Refine note (applies to entire story package)</div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={placeholder}
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

function toReadableText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => toReadableText(item))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key}: ${toReadableText(entry)}`)
      .filter((line) => !line.endsWith(': '))
    return entries.join('; ')
  }
  return String(value)
}

function formatGenreAndTone(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return toReadableText(value)

  const record = value as Record<string, unknown>
  const primaryGenre = toReadableText(record.primaryGenre || record.genre)
  const subGenres = toReadableText(record.subGenres)
  const tone = toReadableText(record.tone)

  return [primaryGenre, subGenres, tone].filter(Boolean).join(' - ')
}

export function LoglineCard({ content, onRegenerate, onRefine, isRefining }: { content: string } & BaseCardProps) {
  return (
    <CardShell title="LOGLINE" isRefining={isRefining}>
      <div className="border-l-2 border-l-[#C8A97E] pl-4 text-[#E5E5E5] text-[1.1rem] font-light leading-[1.8]">{content}</div>
      <ActionRow onCopy={() => copyText(content)} onRegenerate={onRegenerate} isRefining={isRefining} />
      <RefineRow
        onRefine={onRefine}
        isRefining={isRefining}
        placeholder="e.g. make it darker, add urgency, the protagonist is actually an anti-hero..."
      />
    </CardShell>
  )
}

export function SynopsisCard({ content, onRegenerate, onRefine, isRefining }: { content: string } & BaseCardProps) {
  return (
    <CardShell title="SYNOPSIS" isRefining={isRefining}>
      <div className="text-[#E5E5E5] text-[0.9rem] leading-[1.8] whitespace-pre-wrap">{content}</div>
      <ActionRow onCopy={() => copyText(content)} onRegenerate={onRegenerate} isRefining={isRefining} />
      <RefineRow
        onRefine={onRefine}
        isRefining={isRefining}
        placeholder="e.g. compress the second act, add a twist, emphasise the emotional stakes..."
      />
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
    <CardShell title="GENRE + TONE" isRefining={isRefining}>
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
      <RefineRow
        onRefine={onRefine}
        isRefining={isRefining}
        placeholder="e.g. shift to thriller, add horror elements, make it more grounded..."
      />
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
    <CardShell title="CHARACTER BREAKDOWN" isRefining={isRefining}>
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
      <RefineRow
        onRefine={onRefine}
        isRefining={isRefining}
        placeholder="e.g. add a rival character, make the lead's motivation more complex..."
      />
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
  const loglineText = toReadableText(asObject?.logline)
  const synopsisText = toReadableText(asObject?.synopsis)
  const genreToneText = asObject ? formatGenreAndTone(asObject.genreAndTone || asObject.genre || asObject.tone) : ''
  const charactersText = toReadableText(asObject?.characters)
  const hasCharacters = Boolean(charactersText)

  return (
    <CardShell title="ONE-PAGER" isRefining={isRefining}>
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
              <div className="whitespace-pre-wrap text-sm leading-[1.8] text-[#E5E5E5] bg-[#0A0A0A] border border-[#2A2A2A] rounded-[8px] p-3">
                {charactersText}
              </div>
            </>
          )}
          {!titleText && !loglineText && !synopsisText && !genreToneText && !hasCharacters && (
            <div className="whitespace-pre-wrap text-sm leading-[1.8] text-[#E5E5E5] bg-[#0A0A0A] border border-[#2A2A2A] rounded-[8px] p-3">
              {toReadableText(asObject)}
            </div>
          )}
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-[1.8] text-[#E5E5E5] bg-[#0A0A0A] border border-[#2A2A2A] rounded-[8px] p-3">
          {toReadableText(content)}
        </div>
      )}
      <ActionRow onCopy={() => copyText(textVersion)} onRegenerate={onRegenerate} copyLabel="Copy full one-pager" isRefining={isRefining} />
      <RefineRow
        onRefine={onRefine}
        isRefining={isRefining}
        placeholder="e.g. make it sound more commercial, target OTT platforms, punch up the logline..."
      />
    </CardShell>
  )
}
