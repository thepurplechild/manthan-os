'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReanalyseButtonProps {
  projectId: string
}

export function ReanalyseButton({ projectId }: ReanalyseButtonProps) {
  const [running, setRunning] = useState(false)

  const run = async () => {
    if (running) return
    setRunning(true)
    try {
      await fetch('/api/brain/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      window.dispatchEvent(new CustomEvent('manthan-brain-reanalyse'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-[#C8A97E] hover:bg-transparent hover:text-[#E5E5E5]"
      onClick={run}
      disabled={running}
    >
      {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
      Re-analyse with Manthan
    </Button>
  )
}
