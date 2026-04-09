import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ProjectBoard } from '@/components/board/ProjectBoard'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title, description')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (projectError || !project) notFound()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, asset_type, processing_status, file_size_bytes, mime_type, asset_metadata, created_at, extracted_text, storage_url')
    .eq('project_id', id)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const documentIds = (documents || []).map((d) => d.id)

  const { data: brain } = await supabase
    .from('project_brain')
    .select('*')
    .eq('project_id', id)
    .single()

  const { data: suggestions } = await supabase
    .from('project_suggestions')
    .select('id, suggestion_type, title, body, options, status')
    .eq('project_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: messages } = await supabase
    .from('project_brain_messages')
    .select('id, role, content, message_type, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  const { data: rawOutputs } =
    documentIds.length > 0
      ? await supabase
          .from('script_analysis_outputs')
          .select('id, output_type, content, created_at')
          .in('document_id', documentIds)
          .eq('status', 'GENERATED')
          .order('created_at', { ascending: false })
      : { data: [] }

  const latestByType = (rawOutputs || []).reduce<Record<string, { content: unknown }>>((acc, o) => {
    const rec = o as { output_type: string; content: unknown }
    if (!acc[rec.output_type]) acc[rec.output_type] = { content: rec.content }
    return acc
  }, {})

  const loglineRaw = latestByType.LOGLINES?.content as { loglines?: Array<{ text?: string }> } | string | undefined
  const logline = typeof loglineRaw === 'string' ? loglineRaw : loglineRaw?.loglines?.find((l) => l?.text)?.text || undefined

  const synopsisRaw = latestByType.SYNOPSIS?.content as { long?: string; short?: string } | string | undefined
  const synopsis = typeof synopsisRaw === 'string' ? synopsisRaw : synopsisRaw?.long || synopsisRaw?.short || undefined

  const outputs = {
    logline,
    synopsis,
    characterBreakdown: latestByType.CHARACTER_BIBLE?.content ?? undefined,
    genreTone: latestByType.GENRE_CLASSIFICATION?.content ?? undefined,
    onePager: latestByType.ONE_PAGER?.content ?? undefined,
  }

  return (
    <ProjectBoard
      projectId={project.id}
      projectTitle={project.title}
      initialDocuments={
        (documents as Array<{
          id: string
          title: string
          asset_type: string
          processing_status: string
          file_size_bytes: number
          mime_type: string
          asset_metadata: Record<string, unknown> | null
          created_at: string
          extracted_text: string | null
          storage_url: string | null
        }>) || []
      }
      initialBrain={
        (brain as {
          story_summary: string
          known_dimensions: Record<string, string>
          identified_gaps: string[]
          synthesised_context: string
          last_analysed_at: string
        } | null) || null
      }
      initialSuggestions={
        (suggestions as Array<{
          id: string
          suggestion_type: string
          title: string
          body: string
          options: string[]
          status: string
        }>) || []
      }
      initialMessages={
        (messages as Array<{
          id: string
          role: string
          content: string
          message_type: string
          created_at: string
        }>) || []
      }
      initialOutputs={outputs}
    />
  )
}
