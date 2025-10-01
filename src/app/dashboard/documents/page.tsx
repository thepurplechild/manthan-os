'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  Loader2,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getDocuments, deleteDocument, getDocumentDownloadUrl } from '@/app/actions/documents'

interface Document {
  id: string
  title: string
  created_at: string
  file_size_bytes: number
  processing_status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  storage_url: string
  storage_path: string
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
    month: 'short',
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

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const result = await getDocuments()
      if (result.error) {
        setError(result.error)
      } else {
        setDocuments(result.documents || [])
      }
    } catch {
      setError('Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeletingId(documentId)
    try {
      const result = await deleteDocument(documentId)
      if (result.error) {
        setError(result.error)
      } else {
        setDocuments(documents.filter(doc => doc.id !== documentId))
      }
    } catch {
      setError('Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (documentId: string) => {
    try {
      const result = await getDocumentDownloadUrl(documentId)
      if (result.error) {
        setError(result.error)
      } else {
        // Create a temporary link and trigger download
        const link = document.createElement('a')
        link.href = result.downloadUrl!
        link.download = result.filename!
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch {
      setError('Failed to download document')
    }
  }

  const handleView = (document: Document) => {
    router.push(`/dashboard/documents/${document.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { setError(null); fetchDocuments(); }}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-2">
              Manage your uploaded documents
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Link>
          </Button>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              You haven&apos;t uploaded any documents yet. Upload your first document to get started.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard/upload">Upload your first document</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-2">
            Manage your uploaded documents ({documents.length} total)
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </Button>
      </div>

      {isMobile ? (
        // Mobile Card View
        <div className="grid gap-4">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium truncate">
                      {document.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(document.processing_status)}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(document)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(document.id)}
                        className="text-red-600"
                        disabled={deletingId === document.id}
                      >
                        {deletingId === document.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span>{formatDate(document.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatFileSize(document.file_size_bytes)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop Table View
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]" title={document.title}>
                        {document.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(document.created_at)}</TableCell>
                  <TableCell>{formatFileSize(document.file_size_bytes)}</TableCell>
                  <TableCell>{getStatusBadge(document.processing_status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(document)}
                        title="View document"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document.id)}
                        title="Download document"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                        disabled={deletingId === document.id}
                        title="Delete document"
                        className="text-red-600 hover:text-red-700"
                      >
                        {deletingId === document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}