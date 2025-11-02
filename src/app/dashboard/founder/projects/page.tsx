import { createClient } from '@/lib/supabase/server'
import { requireFounder } from '@/app/actions/profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Search, Plus } from 'lucide-react'
import type { Project } from '@/lib/types/projects'

export default async function FounderProjectsPage() {
  try {
    await requireFounder()
  } catch (error) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Fetch all projects with owner information
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  const projectsList = (projects || []).map((project: any) => ({
    ...project,
    owner_name: project.owner?.full_name || project.owner?.email || 'Unknown',
  })) as Array<Project & { owner_name: string }>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
          <p className="text-gray-600 mt-2">View and manage all creator projects</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique Creators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(projectsList.map(p => p.owner_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projects This Month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectsList.filter(p => {
                const created = new Date(p.created_at)
                const now = new Date()
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Projects List</CardTitle>
          <CardDescription>All projects across all creators</CardDescription>
        </CardHeader>
        <CardContent>
          {projectsList.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No projects found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Creator</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsList.map((project) => (
                    <tr key={project.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/founder/projects/${project.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {project.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {project.owner_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(project.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 capitalize">
                          {project.status || 'draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/founder/projects/${project.id}`}>
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

