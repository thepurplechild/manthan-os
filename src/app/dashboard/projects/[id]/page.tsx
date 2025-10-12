import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, formatFileSize, getTotalAssetCount } from '@/lib/types/projects';
import type { Project } from '@/lib/types/projects';
import { DeleteProjectButton } from '@/components/projects/DeleteProjectButton';
import { ConceptGenerator } from '@/components/ai/ConceptGenerator';
import { AssetGallery } from '@/components/AssetGallery';

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

      {/* Tabs for Assets and AI Generator */}
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="ai-generator">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Assets ({documents?.length || 0})</h2>
              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${id}/upload`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Assets
                </Link>
              </Button>
            </div>

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
              <AssetGallery
                assets={documents.map(doc => ({
                  id: doc.id,
                  title: doc.title,
                  asset_type: doc.asset_type,
                  storage_url: doc.storage_url,
                  mime_type: doc.mime_type || '',
                  file_size_bytes: doc.file_size_bytes,
                  asset_metadata: doc.asset_metadata || {},
                  created_at: doc.created_at
                }))}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai-generator">
          <ConceptGenerator projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}