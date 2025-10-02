'use client'

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

// Configure PDF.js worker - use exact version match
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.js'

interface PDFViewerProps {
  url: string
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pageInput, setPageInput] = useState<string>('1')

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF document')
    setLoading(false)
  }, [])

  const onPageLoadError = useCallback((error: Error) => {
    console.error('Error loading page:', error)
    setError('Failed to load PDF page')
  }, [])

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, numPages))
    setPageNumber(validPage)
    setPageInput(validPage.toString())
  }

  const handlePageInputChange = (value: string) => {
    setPageInput(value)
    const pageNum = parseInt(value, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      setPageNumber(pageNum)
    }
  }

  const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(pageInput, 10)
      if (!isNaN(pageNum)) {
        goToPage(pageNum)
      }
    }
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const rotate = () => setRotation(prev => (prev + 90) % 360)

  const previousPage = () => goToPage(pageNumber - 1)
  const nextPage = () => goToPage(pageNumber + 1)

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading PDF</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Document
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousPage}
            disabled={pageNumber <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={pageInput}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onKeyPress={handlePageInputKeyPress}
              className="w-16 text-center"
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">
              of {numPages || '--'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={pageNumber >= numPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5 || loading}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 3.0 || loading}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={rotate}
            disabled={loading}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex justify-center">
          {loading && (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          <Card className="shadow-lg">
            <CardContent className="p-0">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
                error=""
                noData=""
                className="pdf-document"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  onLoadError={onPageLoadError}
                  loading=""
                  error=""
                  noData=""
                  className="pdf-page"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}