import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/lib/types/projects';

export default async function ProjectsPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user's projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
  }

  const projectsList = (projects || []) as Project[];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {projectsList.length} {projectsList.length === 1 ? 'project' : 'projects'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {projectsList.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first project to start organizing your creative assets
          </p>
          <Button asChild size="lg">
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Create First Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsList.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
            />
          ))}
        </div>
      )}
    </div>
  );
}