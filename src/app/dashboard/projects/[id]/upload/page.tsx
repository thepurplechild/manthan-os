import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { BatchUpload } from '@/components/upload/BatchUpload';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/lib/types/projects';

interface UploadPageProps {
  params: Promise<{ id: string }>;
}

export default async function UploadPage({ params }: UploadPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch project to verify ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const projectData = project as Project;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Link>
        </Button>

        <h1 className="text-3xl font-bold">Upload Assets</h1>
        <p className="text-muted-foreground mt-2">
          Add multiple files to &ldquo;{projectData.title}&rdquo;
        </p>
      </div>

      {/* Batch Upload Component */}
      <BatchUpload projectId={id} />
    </div>
  );
}