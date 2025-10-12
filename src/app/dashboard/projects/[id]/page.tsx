import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, formatFileSize, getTotalAssetCount } from '@/lib/types/projects';
import type { Project } from '@/lib/types/projects';
import { DeleteAssetButton } from '@/components/assets/DeleteAssetButton';
import { DeleteProjectButton } from '@/components/projects/DeleteProjectButton';
import { EditAssetDialog } from '@/components/assets/EditAssetDialog';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch project
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

  // Fetch project documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{projectData.title}</h1>
            {projectData.description && (
              <p className="text-muted-foreground mt-2">{projectData.description}</p>
            )}

            {/* Asset counts */}
            <div className="flex flex-wrap gap-2 mt-4">
              {projectData.asset_counts && Object.entries(projectData.asset_counts).map(([type, count]) => (
                <Badge
                  key={type}
                  className={`${ASSET_TYPE_COLORS[type]} text-white`}
                >
                  {ASSET_TYPE_LABELS[type]}: {count}
                </Badge>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Total size: {formatFileSize(projectData.total_size_bytes)}
            </p>
          </div>

          <div className="flex gap-2">
            <DeleteProjectButton
              projectId={id}
              projectTitle={projectData.title}
              assetCount={getTotalAssetCount(projectData.asset_counts)}
            />
            <Button asChild>
              <Link href={`/dashboard/projects/${id}/upload`}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Assets
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Assets ({documents?.length || 0})</h2>

        {!documents || documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No assets yet</p>
            <Button asChild>
              <Link href={`/dashboard/projects/${id}/upload`}>
                <Upload className="h-4 w-4 mr-2" />
                Upload First Asset
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 hover:bg-accent transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{doc.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={ASSET_TYPE_COLORS[doc.asset_type]}>
                        {ASSET_TYPE_LABELS[doc.asset_type] || doc.asset_type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size_bytes)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {doc.asset_type === 'SCRIPT' && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/documents/${doc.id}`}>
                          View Analysis
                        </Link>
                      </Button>
                    )}
                    <EditAssetDialog
                      assetId={doc.id}
                      currentTitle={doc.title}
                      currentType={doc.asset_type}
                      currentMetadata={doc.asset_metadata}
                    />
                    <DeleteAssetButton
                      assetId={doc.id}
                      assetTitle={doc.title}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}