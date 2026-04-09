'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'

type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor'

interface Character {
  id: string
  name: string
  role: CharacterRole
  want: string
  need: string
  wound: string
  arc: string
  notes: string
}

const roleBadgeStyle: Record<CharacterRole, string> = {
  protagonist: 'border-[#C8A97E]/40 bg-[#C8A97E]/15 text-[#C8A97E]',
  antagonist: 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]',
  supporting: 'border-[#888888]/40 bg-[#888888]/15 text-[#888888]',
  minor: 'border-[#555555]/40 bg-[#555555]/15 text-[#555555]',
}

function getCharacterHealth(c: Character): 'complete' | 'partial' | 'missing' {
  if (c.name && c.want && c.wound && c.arc) return 'complete'
  if (c.name && c.want) return 'partial'
  return 'missing'
}

function getPanelHealth(chars: Character[]): 'complete' | 'partial' | 'missing' | null {
  if (chars.length === 0) return null
  const healths = chars.map(getCharacterHealth)
  if (healths.every((h) => h === 'complete')) return 'complete'
  if (healths.some((h) => h !== 'missing')) return 'partial'
  return 'missing'
}

interface CharactersPanelProps {
  projectId: string
  isVisible: boolean
  onToggle: () => void
}

export function CharactersPanel({ projectId, isVisible, onToggle }: CharactersPanelProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`canvas-characters-${projectId}`)
    if (stored) {
      try { setCharacters(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [projectId])

  useEffect(() => {
    localStorage.setItem(`canvas-characters-${projectId}`, JSON.stringify(characters))
  }, [characters, projectId])

  const addCharacter = () => {
    const id = `char-${Date.now()}`
    setCharacters((prev) => [
      ...prev,
      { id, name: '', role: 'protagonist', want: '', need: '', wound: '', arc: '', notes: '' },
    ])
    setExpandedId(id)
  }

  const updateCharacter = (id: string, field: keyof Character, value: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const removeCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const fieldDefs: { key: keyof Character; label: string; placeholder: string; multiline?: boolean }[] = [
    { key: 'want', label: 'Want', placeholder: 'What do they want externally?' },
    { key: 'need', label: 'Need', placeholder: 'What do they actually need internally?' },
    { key: 'wound', label: 'Wound', placeholder: 'What happened to them that drives everything?' },
    { key: 'arc', label: 'Arc', placeholder: 'How do they change by the end?' },
    { key: 'notes', label: 'Notes', placeholder: 'Anything else...', multiline: true },
  ]

  return (
    <CanvasPanel
      id="characters"
      title="Characters"
      icon={<Users className="h-4 w-4" />}
      isVisible={isVisible}
      onToggle={onToggle}
      defaultWidth="full"
      healthStatus={getPanelHealth(characters)}
    >
      <div className="space-y-3">
        {characters.map((character) => {
          const isExpanded = expandedId === character.id
          const health = getCharacterHealth(character)
          const healthDot =
            health === 'complete' ? 'bg-[#C8A97E]' : health === 'partial' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'

          return (
            <div key={character.id} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A]">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-[#111111] transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : character.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#555555]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[#555555]" />
                )}
                <input
                  value={character.name}
                  onChange={(e) => updateCharacter(character.id, 'name', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Character name"
                  className="flex-1 bg-transparent text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none"
                />
                <Badge className={`border text-[10px] capitalize ${roleBadgeStyle[character.role]}`}>
                  {character.role}
                </Badge>
                <span className={`h-2 w-2 rounded-full ${healthDot}`} />
              </button>

              {isExpanded && (
                <div className="border-t border-[#1E1E1E] px-3 py-3 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">Role</label>
                    <select
                      value={character.role}
                      onChange={(e) => updateCharacter(character.id, 'role', e.target.value)}
                      className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] focus:outline-none focus:border-[#C8A97E]/50"
                    >
                      <option value="protagonist">Protagonist</option>
                      <option value="antagonist">Antagonist</option>
                      <option value="supporting">Supporting</option>
                      <option value="minor">Minor</option>
                    </select>
                  </div>

                  {fieldDefs.map((def) =>
                    def.multiline ? (
                      <div key={def.key} className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">{def.label}</label>
                        <textarea
                          value={character[def.key]}
                          onChange={(e) => updateCharacter(character.id, def.key, e.target.value)}
                          placeholder={def.placeholder}
                          className="w-full min-h-16 rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50 resize-y"
                        />
                      </div>
                    ) : (
                      <div key={def.key} className="space-y-1">
                        <label className="text-[10px] uppercase tracking-[0.18em] text-[#C8A97E]">{def.label}</label>
                        <input
                          value={character[def.key]}
                          onChange={(e) => updateCharacter(character.id, def.key, e.target.value)}
                          placeholder={def.placeholder}
                          className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#444444] focus:outline-none focus:border-[#C8A97E]/50"
                        />
                      </div>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => removeCharacter(character.id)}
                    className="flex items-center gap-1 text-[10px] text-[#555555] hover:text-[#EF4444] transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={addCharacter}
          className="flex items-center gap-1.5 text-sm text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Character
        </button>
      </div>
    </CanvasPanel>
  )
}
