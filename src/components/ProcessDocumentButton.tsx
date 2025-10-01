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
    setIsProcessing(true)
    try {
      const result = await processDocument(documentId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Document analysis started!')
        router.refresh()
      }
    } catch (error) {
      toast.error('Failed to start analysis')
    } finally {
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