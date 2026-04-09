'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'

interface StoryCoreProps {
  projectId: string
  initialDescription: string
  logline: string
  isVisible: boolean
  onToggle: () => void
  onRegenerateLogline?: () => void
}

export function StoryCorePanel({
  projectId,
  initialDescription,
  logline,
  isVisible,
  onToggle,
  onRegenerateLogline,
}: StoryCoreProps) {
  const [premise, setPremise] = useState(initialDescription)
  const [centralQuestion, setCentralQuestion] = useState('')
  const [theme, setTheme] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(`canvas-storycore-${projectId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { centralQuestion?: string; theme?: string }
        if (parsed.centralQuestion) setCentralQuestion(parsed.centralQuestion)
        if (parsed.theme) setTheme(parsed.theme)
      } catch { /* ignore */ }
    }
  }, [projectId])

  useEffect(() => {
    localStorage.setItem(
      `canvas-storycore-${projectId}`,
      JSON.stringify({ centralQuestion, theme })
    )
  }, [centralQuestion, theme, projectId])

  const savePremise = async () => {
    const supabase = createClient()
    await supabase.from('projects').update({ description: premise }).eq('id', projectId)
  }

  const healthStatus = premise && centralQuestion && theme
    ? 'complete' as const
    : premise || centralQuestion || theme
      ? 'partial' as const
      : 'missing' as const

  return (
    <CanvasPanel
      id="story-core"
      title="Story Core"
      icon={<BookOpen className="h-4 w-4" />}
      isVisible={isVisible}
      onToggle={onToggle}
      defaultWidth="full"
      healthStatus={healthStatus}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Premise</label>
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            onBlur={savePremise}
            placeholder="What is this story about? Write anything — a situation, a feeling, a character, a world."
            className="w-full min-h-24 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
          />
        </div>

        {logline && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Logline</label>
              {onRegenerateLogline && (
                <button
                  type="button"
                  onClick={onRegenerateLogline}
                  className="text-[10px] text-[#666666] hover:text-[#C8A97E] transition-colors"
                >
                  Regenerate
                </button>
              )}
            </div>
            <div className="border-l-2 border-l-[#C8A97E] pl-3 text-[#E5E5E5] text-sm font-light leading-[1.8]">
              {logline}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">
            The Question This Story Asks
          </label>
          <input
            value={centralQuestion}
            onChange={(e) => setCentralQuestion(e.target.value)}
            placeholder="e.g. Can a man unlearn the cowardice that defined his youth?"
            className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
          />
          <p className="text-[10px] text-[#444444]">Every story asks and answers one question. What is yours?</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Theme</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Love requires the courage to betray what you were taught"
            className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
          />
          <p className="text-[10px] text-[#444444]">Not a topic. A statement.</p>
        </div>
      </div>
    </CanvasPanel>
  )
}
