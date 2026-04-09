'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Plus, Trash2 } from 'lucide-react'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'

interface Theme {
  id: string
  statement: string
  howDramatised: string
}

interface ThemesPanelProps {
  projectId: string
  isVisible: boolean
  onToggle: () => void
}

export function ThemesPanel({ projectId, isVisible, onToggle }: ThemesPanelProps) {
  const [themes, setThemes] = useState<Theme[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(`canvas-themes-${projectId}`)
    if (stored) {
      try { setThemes(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [projectId])

  useEffect(() => {
    localStorage.setItem(`canvas-themes-${projectId}`, JSON.stringify(themes))
  }, [themes, projectId])

  const addTheme = () => {
    setThemes((prev) => [...prev, { id: `theme-${Date.now()}`, statement: '', howDramatised: '' }])
  }

  const updateTheme = (id: string, field: keyof Theme, value: string) => {
    setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const removeTheme = (id: string) => {
    setThemes((prev) => prev.filter((t) => t.id !== id))
  }

  const healthStatus = themes.length === 0
    ? null
    : themes.every((t) => t.statement && t.howDramatised)
      ? 'complete' as const
      : themes.some((t) => t.statement)
        ? 'partial' as const
        : 'missing' as const

  return (
    <CanvasPanel
      id="themes"
      title="Themes"
      icon={<Sparkles className="h-4 w-4" />}
      isVisible={isVisible}
      onToggle={onToggle}
      defaultWidth="full"
      healthStatus={healthStatus}
    >
      <div className="space-y-3">
        {themes.map((theme) => (
          <div key={theme.id} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Statement</label>
                  <input
                    value={theme.statement}
                    onChange={(e) => updateTheme(theme.id, 'statement', e.target.value)}
                    placeholder="Love requires betrayal of what you were taught"
                    className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">How Dramatised</label>
                  <textarea
                    value={theme.howDramatised}
                    onChange={(e) => updateTheme(theme.id, 'howDramatised', e.target.value)}
                    placeholder="Which characters carry this theme? Which scenes dramatise it?"
                    className="w-full min-h-16 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
                  />
                </div>
              </div>
              <button type="button" onClick={() => removeTheme(theme.id)} className="mt-1 text-[#555555] hover:text-[#EF4444]">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addTheme}
          className="flex items-center gap-1.5 text-sm text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Theme
        </button>
      </div>
    </CanvasPanel>
  )
}
