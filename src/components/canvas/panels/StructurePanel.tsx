'use client'

import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'

interface Act {
  id: string
  label: string
  description: string
  turningPoint: string
}

const defaultActs: Act[] = [
  { id: 'act-1', label: 'Setup', description: '', turningPoint: '' },
  { id: 'act-2', label: 'Confrontation', description: '', turningPoint: '' },
  { id: 'act-3', label: 'Resolution', description: '', turningPoint: '' },
]

interface StructurePanelProps {
  projectId: string
  isVisible: boolean
  onToggle: () => void
}

export function StructurePanel({ projectId, isVisible, onToggle }: StructurePanelProps) {
  const [acts, setActs] = useState<Act[]>(defaultActs)

  useEffect(() => {
    const stored = localStorage.getItem(`canvas-structure-${projectId}`)
    if (stored) {
      try { setActs(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [projectId])

  useEffect(() => {
    localStorage.setItem(`canvas-structure-${projectId}`, JSON.stringify(acts))
  }, [acts, projectId])

  const updateAct = (id: string, field: keyof Act, value: string) => {
    setActs((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const addAct = () => {
    setActs((prev) => [...prev, { id: `act-${Date.now()}`, label: '', description: '', turningPoint: '' }])
  }

  const removeAct = (id: string) => {
    setActs((prev) => prev.filter((a) => a.id !== id))
  }

  const healthStatus = acts.some((a) => a.description && a.turningPoint)
    ? acts.every((a) => a.description && a.turningPoint)
      ? 'complete' as const
      : 'partial' as const
    : null

  return (
    <CanvasPanel
      id="structure"
      title="Structure"
      icon={<Layers className="h-4 w-4" />}
      isVisible={isVisible}
      onToggle={onToggle}
      defaultWidth="full"
      healthStatus={healthStatus}
    >
      <div className="space-y-3">
        {acts.map((act, index) => (
          <div key={act.id} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#555555] w-4 text-right">{index + 1}</span>
              <input
                value={act.label}
                onChange={(e) => updateAct(act.id, 'label', e.target.value)}
                placeholder="Act name"
                className="flex-1 bg-transparent text-sm text-[#E5E5E5] font-medium placeholder:text-[#444444] focus:outline-none"
              />
              {acts.length > 1 && (
                <button type="button" onClick={() => removeAct(act.id)} className="text-[#555555] hover:text-[#EF4444]">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <textarea
              value={act.description}
              onChange={(e) => updateAct(act.id, 'description', e.target.value)}
              placeholder="What happens in this act?"
              className="w-full min-h-16 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
            />
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Turning Point</label>
              <input
                value={act.turningPoint}
                onChange={(e) => updateAct(act.id, 'turningPoint', e.target.value)}
                placeholder="What happens at the end of this act that changes everything?"
                className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addAct}
          className="flex items-center gap-1.5 text-sm text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Act
        </button>
      </div>
    </CanvasPanel>
  )
}
