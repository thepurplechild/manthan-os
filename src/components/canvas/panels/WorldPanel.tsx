'use client'

import { useEffect, useState } from 'react'
import { Globe, Plus, Trash2 } from 'lucide-react'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'

interface Location {
  id: string
  name: string
  description: string
  significance: string
}

interface WorldPanelProps {
  projectId: string
  isVisible: boolean
  onToggle: () => void
}

export function WorldPanel({ projectId, isVisible, onToggle }: WorldPanelProps) {
  const [timePeriod, setTimePeriod] = useState('')
  const [socialContext, setSocialContext] = useState('')
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(`canvas-world-${projectId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.timePeriod) setTimePeriod(parsed.timePeriod)
        if (parsed.socialContext) setSocialContext(parsed.socialContext)
        if (parsed.locations) setLocations(parsed.locations)
      } catch { /* ignore */ }
    }
  }, [projectId])

  useEffect(() => {
    localStorage.setItem(
      `canvas-world-${projectId}`,
      JSON.stringify({ timePeriod, socialContext, locations })
    )
  }, [timePeriod, socialContext, locations, projectId])

  const addLocation = () => {
    setLocations((prev) => [...prev, { id: `loc-${Date.now()}`, name: '', description: '', significance: '' }])
  }

  const updateLocation = (id: string, field: keyof Location, value: string) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id))
  }

  const healthStatus = timePeriod && socialContext && locations.length > 0
    ? 'complete' as const
    : timePeriod || socialContext || locations.length > 0
      ? 'partial' as const
      : null

  return (
    <CanvasPanel
      id="world"
      title="World"
      icon={<Globe className="h-4 w-4" />}
      isVisible={isVisible}
      onToggle={onToggle}
      defaultWidth="full"
      healthStatus={healthStatus}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Time Period</label>
          <input
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            placeholder="e.g. Present-day Mumbai, 1960s Bhubaneswar, near-future Delhi"
            className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Social Context</label>
          <textarea
            value={socialContext}
            onChange={(e) => setSocialContext(e.target.value)}
            placeholder="The rules of this world — what is normal here, what is forbidden, what is possible?"
            className="w-full min-h-20 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Locations</label>
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={loc.name}
                  onChange={(e) => updateLocation(loc.id, 'name', e.target.value)}
                  placeholder="Location name"
                  className="flex-1 bg-transparent text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none"
                />
                <button type="button" onClick={() => removeLocation(loc.id)} className="text-[#555555] hover:text-[#EF4444]">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <textarea
                value={loc.description}
                onChange={(e) => updateLocation(loc.id, 'description', e.target.value)}
                placeholder="Describe this place..."
                className="w-full min-h-12 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
              />
              <input
                value={loc.significance}
                onChange={(e) => updateLocation(loc.id, 'significance', e.target.value)}
                placeholder="Why does this location matter to the story?"
                className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addLocation}
            className="flex items-center gap-1.5 text-sm text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Location
          </button>
        </div>
      </div>
    </CanvasPanel>
  )
}
