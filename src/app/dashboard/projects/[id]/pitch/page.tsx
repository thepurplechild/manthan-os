import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PitchView } from '@/components/board/PitchView'

interface PitchPageProps {
  params: Promise<{ id: string }>
}

export default async function PitchPage({ params }: PitchPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (projectError || !project) notFound()

  const { data: documents } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', id)
    .eq('owner_id', user.id)

  const documentIds = (documents || []).map((d) => d.id)

  const { data: rawOutputs } =
    documentIds.length > 0
      ? await supabase
          .from('script_analysis_outputs')
          .select('id, output_type, content, created_at')
          .in('document_id', documentIds)
          .eq('status', 'GENERATED')
          .order('created_at', { ascending: false })
      : { data: [] }

  const latestByType = (rawOutputs || []).reduce<Record<string, { id: string; content: unknown }>>((acc, o) => {
    const rec = o as { id: string; output_type: string; content: unknown }
    if (!acc[rec.output_type]) acc[rec.output_type] = { id: rec.id, content: rec.content }
    return acc
  }, {})

  const loglineRaw = latestByType.LOGLINES?.content as { loglines?: Array<{ text?: string }> } | string | undefined
  const logline = typeof loglineRaw === 'string' ? loglineRaw : loglineRaw?.loglines?.find((l) => l?.text)?.text || ''

  const synopsisRaw = latestByType.SYNOPSIS?.content as { long?: string; short?: string } | string | undefined
  const synopsis = typeof synopsisRaw === 'string' ? synopsisRaw : synopsisRaw?.long || synopsisRaw?.short || ''

  const { data: brain } = await supabase
    .from('project_brain')
    .select('known_dimensions')
    .eq('project_id', id)
    .single()

  function extractCharacters(cb: unknown): Array<{ name: string; role?: string; arc?: string }> {
    if (!cb || typeof cb !== 'object') return []
    const r = cb as Record<string, unknown>
    if (!Array.isArray(r.characters)) return []
    return r.characters.map((c: Record<string, unknown>) => ({
      name: String(c.name || 'Unknown'),
      role: c.role ? String(c.role) : undefined,
      arc: (c.arc || c.characterArc || c.description) ? String(c.arc || c.characterArc || c.description) : undefined,
    }))
  }

  function formatOnePager(content: unknown): string {
    if (typeof content === 'string') return content
    if (typeof content === 'object' && content !== null) {
      const c = content as Record<string, unknown>
      const parts: string[] = []
      if (c.logline) parts.push(String(c.logline))
      if (c.synopsis) parts.push(String(c.synopsis))
      if (c.genreAndTone) {
        const g = c.genreAndTone as Record<string, unknown>
        parts.push([g.primaryGenre, Array.isArray(g.subGenres) ? (g.subGenres as string[]).join(', ') : ''].filter(Boolean).join(' — '))
      }
      if (c.themes) parts.push(Array.isArray(c.themes) ? (c.themes as string[]).join('\n') : String(c.themes))
      return parts.join('\n\n')
    }
    return ''
  }

  const outputs = {
    logline,
    synopsis,
    characters: extractCharacters(latestByType.CHARACTER_BIBLE?.content),
    themes: brain?.known_dimensions?.themes
      ? String(brain.known_dimensions.themes).split(',').map((t: string) => t.trim()).filter(Boolean)
      : [],
    onePager: formatOnePager(latestByType.ONE_PAGER?.content),
  }

  return (
    <PitchView
      projectId={project.id}
      projectTitle={project.title}
      outputs={outputs}
    />
  )
}
