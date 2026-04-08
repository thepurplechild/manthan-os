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
import { ProjectStoryPackageTab } from '@/components/projects/ProjectStoryPackageTab';

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

  const projectDocumentIds = (documents || []).map((doc) => doc.id);

  const { data: outputs } = projectDocumentIds.length > 0
    ? await supabase
        .from('script_analysis_outputs')
        .select('*')
        .in('document_id', projectDocumentIds)
        .eq('status', 'GENERATED')
        .order('created_at', { ascending: false })
    : { data: [] as Array<Record<string, unknown>> };

  const latestOutputsByType = (outputs || []).reduce<Record<string, Record<string, unknown>>>((acc, output) => {
    const outputType = String(output.output_type || '');
    if (!outputType || acc[outputType]) return acc;
    acc[outputType] = output;
    return acc;
  }, {});

  const loglineRaw = latestOutputsByType.LOGLINES?.content;
  const logline =
    typeof loglineRaw === 'string'
      ? loglineRaw
      : Array.isArray((loglineRaw as { loglines?: unknown[] })?.loglines)
        ? String(
            ((loglineRaw as { loglines?: Array<{ text?: string }> }).loglines || []).find((item) => item?.text)?.text || ''
          ) || null
        : null;

  const synopsisRaw = latestOutputsByType.SYNOPSIS?.content as
    | string
    | { long?: string; short?: string; tweet?: string }
    | undefined;
  const synopsis =
    typeof synopsisRaw === 'string' ? synopsisRaw : synopsisRaw?.long || synopsisRaw?.short || synopsisRaw?.tweet || null;

  const storyPackageOutputs = {
    logline,
    synopsis,
    genreTone: (latestOutputsByType.GENRE_CLASSIFICATION?.content as Record<string, unknown> | undefined) || null,
    characterBreakdown: latestOutputsByType.CHARACTER_BIBLE?.content ?? null,
    onePager: latestOutputsByType.ONE_PAGER?.content ?? null,
  };

  const generatedOutputTypes = Object.keys(latestOutputsByType);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 text-[#C8A97E] hover:bg-transparent hover:text-[#d8ba90]">
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{projectData.title}</h1>
            {projectData.description && (
              <p className="text-[#A3A3A3] mt-2">{projectData.description}</p>
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

            <p className="text-sm text-[#A3A3A3] mt-4">
              Total size: {formatFileSize(projectData.total_size_bytes)}
            </p>
          </div>

          <div className="flex gap-2">
            <DeleteProjectButton
              projectId={id}
              projectTitle={projectData.title}
              assetCount={getTotalAssetCount(projectData.asset_counts)}
            />
            <Button asChild className="bg-[#C8A97E] text-black hover:bg-[#b8976a]">
              <Link href={`/dashboard/projects/${id}/upload`}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Assets
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs for Assets, Story Package, and AI Generator */}
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList className="bg-[#111111] border border-[#1E1E1E]">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="story-package">Story Package</TabsTrigger>
          <TabsTrigger value="ai-generator">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Assets ({documents?.length || 0})</h2>
              <Button asChild variant="outline" className="border-[#2A2A2A] bg-[#111111] hover:bg-[#171717]">
                <Link href={`/dashboard/projects/${id}/upload`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Assets
                </Link>
              </Button>
            </div>

            {!documents || documents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-[#2A2A2A] rounded-lg bg-[#111111]">
                <p className="text-[#A3A3A3] mb-4">No assets yet</p>
                <Button asChild className="bg-[#C8A97E] text-black hover:bg-[#b8976a]">
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

            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
              <h3 className="text-lg font-semibold text-[#E5E5E5]">Generated Story Package</h3>
              <p className="mt-2 text-sm text-[#A3A3A3]">
                {generatedOutputTypes.length > 0
                  ? `${generatedOutputTypes.length} generated sections ready. Open the Story Package tab to review the full package.`
                  : 'No generated outputs yet. Use AI Generator or continue developing the story to generate package sections.'}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="story-package">
          <ProjectStoryPackageTab projectId={id} outputs={storyPackageOutputs} />
        </TabsContent>

        <TabsContent value="ai-generator">
          <ConceptGenerator projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}