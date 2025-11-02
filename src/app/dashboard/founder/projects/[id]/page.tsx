import { createClient } from '@/lib/supabase/server'
import { requireFounder } from '@/app/actions/profile'
import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, formatFileSize } from '@/lib/types/projects'
import type { Project } from '@/lib/types/projects'
import { getDealsByProject } from '@/app/actions/dealPipeline'
import { DealPipelineSection } from '@/components/founder/DealPipelineSection'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function FounderProjectPage({ params }: ProjectPageProps) {
  try {
    await requireFounder()
  } catch (error) {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabase = await createClient()

  // Fetch project with owner information (founder can access any project)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  const projectData = project as Project & { owner: { id: string; full_name: string | null; email: string | null } }

  // Fetch project documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Fetch deals for this project
  const deals = await getDealsByProject(id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard/founder/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </Button>

          <h1 className="text-3xl font-bold">{projectData.title}</h1>
          {projectData.description && (
            <p className="text-muted-foreground mt-2">{projectData.description}</p>
          )}

          {/* Creator Info */}
          <div className="flex items-center space-x-4 mt-4 p-3 bg-gray-50 rounded-lg">
            <User className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Creator: {projectData.owner.full_name || projectData.owner.email || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500">{projectData.owner.email}</p>
            </div>
            <div className="ml-auto flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Created: {new Date(projectData.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Asset counts */}
          {projectData.asset_counts && Object.keys(projectData.asset_counts).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(projectData.asset_counts).map(([type, count]) => (
                <Badge
                  key={type}
                  className={`${ASSET_TYPE_COLORS[type]} text-white`}
                >
                  {ASSET_TYPE_LABELS[type]}: {count}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4">
            Total size: {formatFileSize(projectData.total_size_bytes)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="pipeline">
            Deal Pipeline ({deals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Project Information</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-medium capitalize">{projectData.status || 'draft'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Public</dt>
                  <dd className="font-medium">{projectData.is_public ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total Assets</dt>
                  <dd className="font-medium">{documents?.length || 0}</dd>
                </div>
              </dl>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Creator Information</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium">{projectData.owner.full_name || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium">{projectData.owner.email || 'Not provided'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          {!documents || documents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No assets uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{doc.title}</h4>
                    <Badge className={ASSET_TYPE_COLORS[doc.asset_type]}>
                      {ASSET_TYPE_LABELS[doc.asset_type]}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(doc.file_size_bytes)}
                  </p>
                  {doc.mime_type && (
                    <p className="text-xs text-gray-400 mb-3">{doc.mime_type}</p>
                  )}
                  {doc.storage_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.storage_url} target="_blank" rel="noopener noreferrer">
                        View Asset
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pipeline">
          <DealPipelineSection projectId={id} initialDeals={deals} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

