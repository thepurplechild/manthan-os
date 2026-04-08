import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { AssetPanel } from '@/components/brain/AssetPanel'
import { BrainPanel } from '@/components/brain/BrainPanel'
import { StoryPackagePanel } from '@/components/brain/StoryPackagePanel'
import { ReanalyseButton } from '@/components/brain/ReanalyseButton'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title, description')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  const { data: assets } = await supabase
    .from('documents')
    .select('id, title, asset_type, processing_status, file_size_bytes, created_at')
    .eq('project_id', id)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const { data: documentsForIds } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', id)
    .eq('owner_id', user.id)

  const documentIds = (documentsForIds || []).map((doc) => doc.id)

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

  async function onAssetAdded() {
    'use server'
    revalidatePath(`/dashboard/projects/${id}`)
  }

  async function onAnalysisComplete() {
    'use server'
    revalidatePath(`/dashboard/projects/${id}`)
  }

  async function onOutputsRegenerated() {
    'use server'
    revalidatePath(`/dashboard/projects/${id}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <div className="px-6 py-5 border-b border-[#1A1A1A]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard/projects" className="inline-flex items-center text-sm text-[#C8A97E] hover:text-[#E5E5E5]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
            <h1 className="mt-3 text-3xl font-light text-[#E5E5E5]">{project.title}</h1>
            {project.description && <p className="mt-1 text-sm text-[#666666]">{project.description}</p>}
          </div>
          <ReanalyseButton projectId={project.id} />
        </div>
      </div>

      <div className="flex h-[calc(100vh-10rem)] bg-[#0A0A0A] overflow-hidden flex-col lg:flex-row">
        <div className="w-full lg:w-64 flex-shrink-0 border-r border-[#1A1A1A] overflow-y-auto">
          <AssetPanel
            projectId={project.id}
            assets={assets || []}
            onAssetAdded={onAssetAdded}
            onAnalysisComplete={onAnalysisComplete}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <BrainPanel
            projectId={project.id}
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
            onOutputsRegenerated={onOutputsRegenerated}
          />
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 border-l border-[#1A1A1A] overflow-y-auto">
          <StoryPackagePanel projectId={project.id} documentIds={documentIds} />
        </div>
      </div>
    </div>
  )
}