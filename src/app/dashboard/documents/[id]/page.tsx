import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDocumentViewUrl } from '@/app/actions/documents'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import PDFViewer from '@/components/PDFViewer'
import { ProcessDocumentButton } from '@/components/ProcessDocumentButton'
import { DocumentSections } from '@/components/DocumentSections'

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPLOADED':
        return 'default'
      case 'PROCESSING':
        return 'secondary'
      case 'COMPLETED':
        return 'default'
      case 'FAILED':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/documents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {document.processing_status === 'UPLOADED' && (
            <ProcessDocumentButton documentId={id} />
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={viewUrl} download>
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{document.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Uploaded {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={getStatusColor(document.processing_status)}>
            {document.processing_status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">File Size:</span>{' '}
            {document.file_size_bytes
              ? `${(document.file_size_bytes / 1024).toFixed(2)} KB`
              : 'Unknown'}
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            {document.processing_status}
          </div>
        </div>
      </div>

      {sections && sections.length > 0 && (
        <DocumentSections sections={sections} />
      )}

      <div className="bg-card border rounded-lg p-4">
        <PDFViewer url={viewUrl} />
      </div>
    </div>
  )
}