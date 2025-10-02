'use client'

import dynamic from 'next/dynamic'

const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[600px]">Loading PDF viewer...</div>
})

interface ClientPDFViewerProps {
  url: string
}

export default function ClientPDFViewer({ url }: ClientPDFViewerProps) {
  return <PDFViewer url={url} />
}