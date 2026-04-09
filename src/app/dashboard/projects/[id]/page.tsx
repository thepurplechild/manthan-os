import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { ReanalyseButton } from '@/components/brain/ReanalyseButton'
import { StoryCanvas } from '@/components/canvas/StoryCanvas'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title, description')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (projectError || !project) notFound()

  const { data: assets } = await supabase
    .from('documents')
    .select('id, title, asset_type, processing_status, file_size_bytes, created_at')
    .eq('project_id', id)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const documentIds = (assets || []).map((doc) => doc.id)

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

  const { data: outputs } = documentIds.length > 0
    ? await supabase
        .from('script_analysis_outputs')
        .select('id, output_type, content, created_at')
        .in('document_id', documentIds)
        .eq('status', 'GENERATED')
        .order('created_at', { ascending: false })
    : { data: [] }

  async function onAssetAdded() {
    'use server'
    revalidatePath(`/dashboard/projects/${id}`)
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] text-[#E5E5E5] overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-[#1A1A1A] px-6 py-3 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/dashboard/projects" className="inline-flex items-center text-sm text-[#C8A97E] hover:text-[#E5E5E5] shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Projects
          </Link>
          <h1 className="text-lg font-light text-[#E5E5E5] truncate">{project.title}</h1>
        </div>
        <ReanalyseButton projectId={project.id} />
      </div>

      <div className="flex-1 overflow-hidden">
        <StoryCanvas
          projectId={project.id}
          projectTitle={project.title}
          projectDescription={project.description || ''}
          initialBrain={(brain as {
            story_summary: string
            known_dimensions: Record<string, string>
            identified_gaps: string[]
            contradictions: unknown[]
            synthesised_context: string
            last_analysed_at: string
          } | null) || null}
          initialSuggestions={(suggestions as Array<{
            id: string
            suggestion_type: string
            title: string
            body: string
            options: string[]
            status: string
          }>) || []}
          initialMessages={(messages as Array<{
            id: string
            role: string
            content: string
            message_type: string
            created_at: string
          }>) || []}
          initialDocuments={(assets as Array<{
            id: string
            title: string
            asset_type: string
            processing_status: string
            file_size_bytes: number
            created_at: string
          }>) || []}
          initialOutputs={(outputs as Array<{
            id: string
            output_type: string
            content: unknown
            created_at: string
          }>) || []}
          onAssetAdded={onAssetAdded}
        />
      </div>
    </div>
  )
}
