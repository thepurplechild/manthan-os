'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { processDocument } from '@/app/actions/process'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function ProcessDocumentButton({ documentId }: { documentId: string }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const handleProcess = async () => {
    console.log('🚀 ProcessDocumentButton: Starting analysis for document:', documentId)
    setIsProcessing(true)
    try {
      console.log('📡 ProcessDocumentButton: Calling processDocument server action...')
      const result = await processDocument(documentId)
      console.log('📨 ProcessDocumentButton: Got result from server action:', result)

      if (result.error) {
        console.error('❌ ProcessDocumentButton: Error from server action:', result.error)
        toast.error(result.error)
      } else {
        console.log('✅ ProcessDocumentButton: Success! Refreshing router...')
        toast.success('Document analysis started!')
        router.refresh()
      }
    } catch (error) {
      console.error('💥 ProcessDocumentButton: Caught exception:', error)
      toast.error('Failed to start analysis')
    } finally {
      console.log('🏁 ProcessDocumentButton: Setting isProcessing to false')
      setIsProcessing(false)
    }
  }

  return (
    <Button onClick={handleProcess} disabled={isProcessing}>
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Analyze Script
        </>
      )}
    </Button>
  )
}