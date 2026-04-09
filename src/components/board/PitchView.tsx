'use client'

import Link from 'next/link'
import { Copy, Download, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface PitchOutputs {
  logline: string
  synopsis: string
  characters: Array<{ name: string; role?: string; arc?: string }>
  themes: string[]
  onePager: string
}

interface PitchViewProps {
  projectId: string
  projectTitle: string
  outputs: PitchOutputs
}

function buildPitchText(title: string, o: PitchOutputs): string {
  const parts = [title.toUpperCase()]
  if (o.logline) parts.push(`LOGLINE\n${o.logline}`)
  if (o.synopsis) parts.push(`SYNOPSIS\n${o.synopsis}`)
  if (o.characters.length > 0) {
    parts.push(`CHARACTERS\n${o.characters.map((c) => `${c.name} · ${c.role || ''} · ${c.arc || ''}`).join('\n')}`)
  }
  if (o.themes.length > 0) parts.push(`THEMES\n${o.themes.map((t) => `— ${t}`).join('\n')}`)
  if (o.onePager) parts.push(`ONE-PAGER\n${o.onePager}`)
  return parts.join('\n\n')
}

export function PitchView({ projectId, projectTitle, outputs }: PitchViewProps) {
  const pitchText = buildPitchText(projectTitle, outputs)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pitchText)
    toast.success('Copied')
  }

  const handleDownload = () => {
    const blob = new Blob([pitchText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectTitle.replace(/\s+/g, '-').toLowerCase()}-pitch.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-6 border-b border-[#161616]">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="flex items-center gap-1.5 text-sm text-[#555555] hover:text-[#E5E5E5] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Board
        </Link>
        <span className="text-sm font-light text-[#E5E5E5] hidden sm:block">{projectTitle}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 text-xs text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> Copy All
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[720px] mx-auto px-8 py-12">
        <h1 className="text-[2rem] font-extralight text-[#E5E5E5] mb-12">{projectTitle}</h1>

        {outputs.logline && (
          <section className="mb-8">
            <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em]">Logline</span>
            <div className="mt-3 border-l-2 border-[#C8A97E] pl-4">
              <p className="text-[1.1rem] font-light leading-[1.8] text-[#E5E5E5]">{outputs.logline}</p>
            </div>
            <hr className="border-[#161616] my-8" />
          </section>
        )}

        {outputs.synopsis && (
          <section className="mb-8">
            <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em]">Synopsis</span>
            <p className="mt-3 text-[15px] font-light leading-[1.8] text-[#E5E5E5] whitespace-pre-wrap">
              {outputs.synopsis}
            </p>
            <hr className="border-[#161616] my-8" />
          </section>
        )}

        {outputs.characters.length > 0 && (
          <section className="mb-8">
            <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em]">Characters</span>
            <div className="mt-3 space-y-3">
              {outputs.characters.map((c) => (
                <div key={c.name}>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C8A97E] text-sm uppercase tracking-wide">{c.name}</span>
                    {c.role && (
                      <span className="rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-0.5 text-[10px] text-[#888888] capitalize">
                        {c.role}
                      </span>
                    )}
                  </div>
                  {c.arc && <p className="text-[#888888] text-sm leading-relaxed mt-1">{c.arc}</p>}
                </div>
              ))}
            </div>
            <hr className="border-[#161616] my-8" />
          </section>
        )}

        {outputs.themes.length > 0 && (
          <section className="mb-8">
            <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em]">Themes</span>
            <div className="mt-3 space-y-1">
              {outputs.themes.map((t) => (
                <p key={t} className="text-[15px] font-light leading-[1.8] text-[#E5E5E5]">— {t}</p>
              ))}
            </div>
            <hr className="border-[#161616] my-8" />
          </section>
        )}

        {outputs.onePager && (
          <section className="mb-8">
            <span className="text-[11px] text-[#C8A97E] uppercase tracking-[0.15em]">One-Pager</span>
            <p className="mt-3 text-[15px] font-light leading-[1.8] text-[#E5E5E5] whitespace-pre-wrap">
              {outputs.onePager}
            </p>
          </section>
        )}

        {!outputs.logline && !outputs.synopsis && (
          <p className="text-[#444444] text-sm">No outputs generated yet. Go back to the board and generate your pitch.</p>
        )}
      </main>
    </div>
  )
}
