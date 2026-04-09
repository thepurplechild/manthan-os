'use client'

import { useEffect, useState } from 'react'

interface ManthanQuestionProps {
  question: string | null
  onDismiss: () => void
  onAnswer: (question: string) => void
}

export function ManthanQuestion({ question, onDismiss, onAnswer }: ManthanQuestionProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (question) {
      const timer = setTimeout(() => setVisible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [question])

  if (!question) return null

  return (
    <div
      className={`fixed bottom-20 right-8 z-40 max-w-sm rounded-[8px] border-l-4 border-l-[#C8A97E] border border-[#1E1E1E] bg-[#111111] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <span className="text-[9px] uppercase tracking-[0.15em] text-[#C8A97E]">Manthan Asks</span>
      <p className="mt-2 text-sm text-[#E5E5E5] leading-relaxed">{question}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onAnswer(question)}
          className="text-xs text-[#C8A97E] hover:text-[#E5E5E5] transition-colors"
        >
          Answer →
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-[#555555] hover:text-[#888888] transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  )
}
