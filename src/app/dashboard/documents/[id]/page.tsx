import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDocumentViewUrl } from '@/app/actions/documents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ClientPDFViewer from '@/components/ClientPDFViewer'
import { ProcessDocumentButton } from '@/components/ProcessDocumentButton'
import { DocumentSections } from '@/components/DocumentSections'
import { CharacterBible } from '@/components/CharacterBible'
import { getCharacterBible } from '@/app/actions/characterBible'
import { GenerateCharacterBibleButton } from '@/components/GenerateCharacterBibleButton'
import { SynopsisDisplay } from '@/components/SynopsisDisplay'
import { GenerateSynopsisButton } from '@/components/GenerateSynopsisButton'
import { getSynopsis } from '@/app/actions/synopsis'
import { LoglinesDisplay } from '@/components/LoglinesDisplay'
import { OnePagerDisplay } from '@/components/OnePagerDisplay'
import { GenerateLoglinesButton } from '@/components/GenerateLoglinesButton'
import { GenerateOnePagerButton } from '@/components/GenerateOnePagerButton'
import { getLoglines } from '@/app/actions/loglines'
import { getOnePager } from '@/app/actions/onePager'
import { ProjectLayout } from '@/components/ProjectLayout'
import { ProjectOverview } from '@/components/ProjectOverview'
import { SemanticSearch } from '@/components/SemanticSearch'
import { UploadAsset } from '@/components/UploadAsset'
import { AssetGallery } from '@/components/AssetGallery'

export default async function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch document directly from Supabase
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (docError || !document) {
    notFound()
  }

  if (document.owner_id !== user.id) {
    redirect('/dashboard/documents')
  }

  const viewUrlResult = await getDocumentViewUrl(id)

  if (!viewUrlResult || viewUrlResult.error || !viewUrlResult.url) {
    return <div>Error loading document</div>
  }

  const viewUrl = viewUrlResult.url

  // Fetch sections if document is completed
  const { data: sections } = await supabase
    .from('document_sections')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: true })

  // Filter out embedding chunks that shouldn't be displayed
  const displayableSections = sections?.filter(section => {
    // Only show sections that are actual analysis results, not embeddings
    const validTypes = ['CHARACTERS', 'SCENES', 'DIALOGUE', 'TEXT'];
    return section.section_type && validTypes.includes(section.section_type.toUpperCase());
  }) || [];

  // Fetch Character Bible if it exists
  const characterBibleResult = await getCharacterBible(id)

  // Fetch Synopsis if it exists
  const synopsisResult = await getSynopsis(id)

  // Fetch Loglines if they exist
  const loglinesResult = await getLoglines(id)

  // Fetch One-Pager if it exists
  const onePagerResult = await getOnePager(id)

  // Check prerequisites for One-Pager
  const hasOnePagerPrerequisites =
    characterBibleResult.success &&
    synopsisResult.success &&
    loglinesResult.success

  // Fetch ALL related assets (not just images)
  const { data: relatedAssets } = await supabase
    .from('documents')
    .select('id, title, asset_type, storage_url, mime_type, file_size_bytes, asset_metadata, created_at')
    .eq('parent_document_id', id)
    .eq('is_primary', false)
    .order('asset_type')
    .order('created_at', { ascending: false })

  // Get signed URL for download
  const { data: signedUrlData } = await supabase.storage
    .from('creator-assets')
    .createSignedUrl(document.storage_path, 3600)

  const signedUrl = signedUrlData?.signedUrl || viewUrl

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/documents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </Button>
      </div>

      <ProjectLayout
        documentTitle={document.title}
        showCharacterBible={characterBibleResult.success}
        showSynopsis={synopsisResult.success}
        showLoglines={loglinesResult.success}
        showOnePager={onePagerResult.success}
        scriptView={
          <div className="space-y-6">
            {/* Project Overview Card */}
            <ProjectOverview
              uploadedAt={document.created_at}
              fileSize={document.file_size_bytes || 0}
              status={document.processing_status}
              hasCharacterBible={characterBibleResult.success}
              hasSynopsis={synopsisResult.success}
              hasLoglines={loglinesResult.success}
              hasOnePager={onePagerResult.success}
              downloadUrl={signedUrl}
            />

            {/* Generate Buttons Section */}
            <Card>
              <CardHeader>
                <CardTitle>Generate AI Analysis</CardTitle>
                <CardDescription>
                  Create professional pitch materials using AI
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {document.processing_status === 'UPLOADED' && (
                  <ProcessDocumentButton documentId={id} />
                )}
                <GenerateCharacterBibleButton
                  documentId={id}
                  hasExisting={characterBibleResult.success}
                  hasExtractedText={!!document.extracted_text}
                />
                <GenerateSynopsisButton
                  documentId={id}
                  hasExisting={synopsisResult.success}
                />
                <GenerateLoglinesButton
                  documentId={id}
                  hasExisting={loglinesResult.success}
                />
                <GenerateOnePagerButton
                  documentId={id}
                  hasExisting={onePagerResult.success}
                  hasPrerequisites={hasOnePagerPrerequisites}
                />
              </CardContent>
            </Card>

            {/* Upload Reference Assets Section */}
            <Card>
              <CardHeader>
                <CardTitle>Reference Materials</CardTitle>
                <CardDescription>
                  Upload scripts, outlines, character sheets, images, audio, video, and other reference materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadAsset documentId={id} />
              </CardContent>
            </Card>

            {/* Display All Assets */}
            {relatedAssets && relatedAssets.length > 0 && (
              <AssetGallery assets={relatedAssets} />
            )}

            {/* PDF Viewer */}
            <Card>
              <CardHeader>
                <CardTitle>Script Document</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientPDFViewer url={viewUrl} />
              </CardContent>
            </Card>

            {/* Legacy Analysis Results (if any) */}
            {displayableSections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Legacy Analysis</CardTitle>
                  <CardDescription>
                    Previous analysis format (kept for reference)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentSections sections={displayableSections} />
                </CardContent>
              </Card>
            )}
          </div>
        }
        characterBible={
          characterBibleResult.success && characterBibleResult.data ? (
            <CharacterBible
              characters={characterBibleResult.data.characters}
              scriptTitle={characterBibleResult.data.scriptTitle}
              generatedAt={characterBibleResult.data.generatedAt}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Character Bible Not Generated</CardTitle>
                <CardDescription>
                  Go to the Script tab and click &quot;Generate Character Bible&quot; to create this analysis.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        }
        synopsis={
          synopsisResult.success && synopsisResult.data ? (
            <SynopsisDisplay
              tweet={synopsisResult.data.tweet}
              short={synopsisResult.data.short}
              long={synopsisResult.data.long}
              scriptTitle={synopsisResult.data.scriptTitle}
              generatedAt={synopsisResult.data.generatedAt}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Synopsis Not Generated</CardTitle>
                <CardDescription>
                  Go to the Script tab and click &quot;Generate Synopsis&quot; to create this analysis.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        }
        loglines={
          loglinesResult.success && loglinesResult.data ? (
            <LoglinesDisplay
              loglines={loglinesResult.data.loglines}
              scriptTitle={loglinesResult.data.scriptTitle}
              generatedAt={loglinesResult.data.generatedAt}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Loglines Not Generated</CardTitle>
                <CardDescription>
                  Go to the Script tab and click &quot;Generate Loglines&quot; to create this analysis.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        }
        onePager={
          onePagerResult.success && onePagerResult.data ? (
            <OnePagerDisplay data={onePagerResult.data} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>One-Pager Not Generated</CardTitle>
                <CardDescription>
                  Generate Character Bible, Synopsis, and Loglines first, then click &quot;Generate One-Pager&quot; in the Script tab.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        }
        searchView={
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Semantic Search</CardTitle>
                <CardDescription>
                  Search within your script using natural language queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SemanticSearch documentId={id} />
              </CardContent>
            </Card>
          </div>
        }
      />
    </div>
  )
}