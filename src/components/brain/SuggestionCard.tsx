'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Suggestion = {
  id: string
  suggestion_type: string
  title: string
  body: string
  options: string[]
  status: string
}

const typeStyles: Record<string, string> = {
  contradiction: 'border-[#FF4444]/30 bg-[#FF4444]/15 text-[#FF4444]',
  gap: 'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]',
  direction: 'border-[#C8A97E]/30 bg-[#C8A97E]/15 text-[#C8A97E]',
  enhancement: 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]',
  character: 'border-[#8B5CF6]/30 bg-[#8B5CF6]/15 text-[#8B5CF6]',
  structure: 'border-[#3B82F6]/30 bg-[#3B82F6]/15 text-[#3B82F6]',
}

interface SuggestionCardProps {
  suggestion: Suggestion
  onDismiss: (id: string) => void
  onApply: (id: string, note: string) => void
}

export function SuggestionCard({ suggestion, onDismiss, onApply }: SuggestionCardProps) {
  const [note, setNote] = useState('')
  const badgeStyle = typeStyles[suggestion.suggestion_type] || 'border-[#C8A97E]/30 bg-[#C8A97E]/15 text-[#C8A97E]'

  return (
    <div className="rounded-[10px] border border-[#1E1E1E] bg-[#0D0D0D] p-4 space-y-3">
      <Badge className={`border ${badgeStyle} capitalize`}>{suggestion.suggestion_type}</Badge>
      <h3 className="text-[#E5E5E5] text-sm font-medium">{suggestion.title}</h3>
      <p className="text-[#888888] text-sm leading-relaxed whitespace-pre-wrap">{suggestion.body}</p>

      {Array.isArray(suggestion.options) && suggestion.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestion.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setNote(option)}
              className="rounded-full border border-[#2A2A2A] bg-[#111111] px-3 py-1 text-xs text-[#C8A97E] hover:border-[#C8A97E]/40"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note or choose a direction above..."
        className="min-h-20 rounded-[8px] border-[#2A2A2A] bg-[#111111] text-[#E5E5E5] placeholder:text-[#666666] focus-visible:ring-0 focus-visible:border-[#C8A97E]/40"
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          className="text-[#888888] hover:text-[#E5E5E5] hover:bg-transparent"
          onClick={() => onDismiss(suggestion.id)}
        >
          Dismiss
        </Button>
        <Button
          className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#b8976a]"
          onClick={() => onApply(suggestion.id, note)}
        >
          Apply -&gt;
        </Button>
      </div>
    </div>
  )
}
