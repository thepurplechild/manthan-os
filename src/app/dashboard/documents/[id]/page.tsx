'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileText, Loader2, AlertCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { getDocumentById, getDocumentViewUrl } from '@/app/actions/documents'
import { processDocument } from '@/app/actions/process'
import PDFViewer from '@/components/PDFViewer'

interface Document {
  id: string
  title: string
  created_at: string
  file_size_bytes: number
  processing_status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  storage_url: string
  storage_path: string
  owner_id: string
}

interface Character {
  name: string
  description: string
}

interface Scene {
  heading: string
  location: string
  timeOfDay?: string
}

interface Dialogue {
  character: string
  text: string
  context?: string
}

interface DocumentSection {
  id: string
  document_id: string
  section_type: string
  content: Character[] | Scene[] | Dialogue[]
  created_at: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'UPLOADED':
      return <Badge variant="processing">Uploaded</Badge>
    case 'PROCESSING':
      return <Badge variant="warning">Processing</Badge>
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>
    case 'FAILED':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function DocumentViewerPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sections, setSections] = useState<DocumentSection[]>([])

  useEffect(() => {
    if (documentId) {
      fetchDocument()
    }
  }, [documentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocument = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch document details
      const documentResult = await getDocumentById(documentId)
      if (documentResult.error) {
        setError(documentResult.error)
        return
      }

      setDocument(documentResult.document!)

      // Get view URL for PDF
      const viewResult = await getDocumentViewUrl(documentId)
      if (viewResult.error) {
        setError(viewResult.error)
        return
      }

      setViewUrl(viewResult.viewUrl!)

      // Fetch analysis results if document is completed
      if (documentResult.document!.processing_status === 'COMPLETED') {
        await fetchAnalysisResults()
      }

    } catch {
      setError('Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalysisResults = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/sections`)
      if (response.ok) {
        const data = await response.json()
        setSections(data.sections || [])
      }
    } catch (error) {
      console.error('Failed to fetch analysis results:', error)
    }
  }

  const handleAnalyzeScript = async () => {
    if (!document) return

    try {
      setProcessing(true)
      setError(null)

      const result = await processDocument(documentId)
      if (result.error) {
        setError(result.error)
        return
      }

      // Refresh document to get updated status
      await fetchDocument()
    } catch {
      setError('Failed to process document')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = async () => {
    if (!document) return

    try {
      setDownloading(true)
      const result = await getDocumentViewUrl(documentId)
      if (result.error) {
        setError(result.error)
        return
      }

      // Create a temporary link and trigger download
      const link = window.document.createElement('a')
      link.href = result.viewUrl!
      link.download = document.title
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
    } catch {
      setError('Failed to download document')
    } finally {
      setDownloading(false)
    }
  }

  const handleBackToDocuments = () => {
    router.push('/dashboard/documents')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Document</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => fetchDocument()}>
                Try Again
              </Button>
              <Button variant="outline" onClick={handleBackToDocuments}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Document not found</p>
          <Button onClick={handleBackToDocuments} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </div>
    )
  }

  const isPDF = document.title.toLowerCase().endsWith('.pdf')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBackToDocuments}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Button>

        <div className="flex items-center gap-2">
          {document.processing_status === 'UPLOADED' && (
            <Button
              onClick={handleAnalyzeScript}
              disabled={processing}
              variant="default"
              className="flex items-center gap-2"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {processing ? 'Analyzing...' : 'Analyze Script'}
            </Button>
          )}
          <Button
            onClick={handleDownload}
            disabled={downloading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download
          </Button>
        </div>
      </div>

      {/* Document Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-xl">{document.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(document.processing_status)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Uploaded:</span>
              <p>{formatDate(document.created_at)}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">File Size:</span>
              <p>{formatFileSize(document.file_size_bytes)}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Type:</span>
              <p>{isPDF ? 'PDF Document' : 'Text Document'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Analysis Results */}
      {document.processing_status === 'COMPLETED' && sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Script Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {sections.map((section) => {
                if (section.section_type === 'characters') {
                  const characters = section.content as Character[]
                  return (
                    <AccordionItem key={section.id} value="characters">
                      <AccordionTrigger>Characters ({characters.length})</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {characters.map((character, index) => (
                            <div key={index} className="border-l-2 border-blue-200 pl-4">
                              <h4 className="font-semibold">{character.name}</h4>
                              <p className="text-sm text-muted-foreground">{character.description}</p>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                }
                if (section.section_type === 'scenes') {
                  const scenes = section.content as Scene[]
                  return (
                    <AccordionItem key={section.id} value="scenes">
                      <AccordionTrigger>Scenes ({scenes.length})</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {scenes.map((scene, index) => (
                            <div key={index} className="border-l-2 border-green-200 pl-4">
                              <h4 className="font-semibold">{scene.heading}</h4>
                              <div className="text-sm text-muted-foreground">
                                <p><strong>Location:</strong> {scene.location}</p>
                                {scene.timeOfDay && <p><strong>Time:</strong> {scene.timeOfDay}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                }
                if (section.section_type === 'dialogue') {
                  const dialogue = section.content as Dialogue[]
                  return (
                    <AccordionItem key={section.id} value="dialogue">
                      <AccordionTrigger>Key Dialogue ({dialogue.length})</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {dialogue.map((line, index) => (
                            <div key={index} className="border-l-2 border-purple-200 pl-4">
                              <h4 className="font-semibold">{line.character}</h4>
                              <p className="text-sm mb-1">&ldquo;{line.text}&rdquo;</p>
                              {line.context && (
                                <p className="text-xs text-muted-foreground italic">{line.context}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                }
                return null
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Document Viewer */}
      <Card className="min-h-[600px]">
        <CardContent className="p-0">
          {viewUrl ? (
            isPDF ? (
              <PDFViewer url={viewUrl} />
            ) : (
              <div className="p-6">
                <iframe
                  src={viewUrl}
                  className="w-full h-[600px] border-0"
                  title={document.title}
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Unable to load document preview</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}