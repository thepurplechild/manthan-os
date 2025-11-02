import { createClient } from '@/lib/supabase/server'
import { requireFounder } from '@/lib/utils/roleGuards'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FolderOpen } from 'lucide-react'
import type { Project } from '@/lib/types/projects'

export default async function FounderProjectsPage() {
  await requireFounder()

  const supabase = await createClient()

  // Fetch ALL projects (founder privilege)
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(
        id,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  const projectsList = (projects || []) as any[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">All Projects</h1>
        <p className="text-muted-foreground mt-1">
          {projectsList.length} {projectsList.length === 1 ? 'project' : 'projects'} across all creators
        </p>
      </div>

      {/* Projects Grid */}
      {projectsList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground">
              Projects will appear here once creators start uploading their work
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsList.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {/* Creator Badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {project.owner?.full_name || 'Unknown Creator'}
                      </Badge>
                    </div>

                    {/* Asset Counts */}
                    {project.asset_counts && Object.keys(project.asset_counts).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(project.asset_counts).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {count} {type}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                      {project.total_size_bytes > 0 && (
                        <span>
                          {(project.total_size_bytes / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

