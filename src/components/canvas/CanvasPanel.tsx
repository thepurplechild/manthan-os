'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const widthClasses = {
  narrow: 'w-72',
  medium: 'w-96',
  wide: 'w-[32rem]',
  full: 'w-full',
} as const

const healthDotColors = {
  complete: 'bg-[#C8A97E]',
  partial: 'bg-[#F59E0B]',
  missing: 'bg-[#EF4444]',
} as const

interface CanvasPanelProps {
  id: string
  title: string
  icon: React.ReactNode
  isVisible: boolean
  onToggle: () => void
  defaultWidth?: keyof typeof widthClasses
  children: React.ReactNode
  healthStatus?: 'complete' | 'partial' | 'missing' | null
}

export function CanvasPanel({
  title,
  icon,
  isVisible,
  defaultWidth = 'medium',
  children,
  healthStatus,
}: CanvasPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (!isVisible) return null

  return (
    <div className={`${widthClasses[defaultWidth]} rounded-[8px] border border-[#1E1E1E] bg-[#111111] overflow-hidden`}>
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-3 hover:bg-[#151515] transition-colors"
      >
        <span className="text-[#C8A97E]">{icon}</span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#C8A97E] flex-1 text-left">{title}</span>
        {healthStatus && <span className={`h-2 w-2 rounded-full ${healthDotColors[healthStatus]}`} />}
        {collapsed ? <ChevronRight className="h-4 w-4 text-[#555555]" /> : <ChevronDown className="h-4 w-4 text-[#555555]" />}
      </button>
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${collapsed ? 'max-h-0' : 'max-h-[2000px]'}`}
      >
        <div className="px-4 pb-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}
