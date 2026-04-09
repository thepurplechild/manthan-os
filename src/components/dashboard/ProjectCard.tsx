'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Stage = 'DEVELOPING' | 'PITCH READY' | 'REVISING'

interface ProjectCardProps {
  id: string
  title: string
  description: string | null
  logline: string | null
  documentCount: number
  characterNames: string[]
  updatedAt: string
}

function getStage(logline: string | null, updatedAt: string, description: string | null): Stage {
  if (logline) {
    const daysSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate > 7) return 'PITCH READY'
    if (description?.toLowerCase().includes('feedback')) return 'REVISING'
  }
  return 'DEVELOPING'
}

const stageStyles: Record<Stage, string> = {
  DEVELOPING: 'bg-[#1A1A1A] text-[#888888] border-[#2A2A2A]',
  'PITCH READY': 'bg-[#C8A97E]/10 text-[#C8A97E] border-[#C8A97E]/30',
  REVISING: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
}

export function ProjectCard({
  id,
  title,
  description,
  logline,
  documentCount,
  characterNames,
  updatedAt,
}: ProjectCardProps) {
  const stage = getStage(logline, updatedAt, description)
  const visibleChars = characterNames.slice(0, 4)
  const extraCount = characterNames.length - 4

  return (
    <Link
      href={`/dashboard/projects/${id}`}
      className="block rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-6 cursor-pointer transition-all duration-200 hover:border-[#C8A97E]/30 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-[1.1rem] font-normal text-[#E5E5E5] line-clamp-2 flex-1 mr-3">{title}</h3>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${stageStyles[stage]}`}>
          {stage}
        </span>
      </div>

      {description && (
        <p className="text-[13px] text-[#666666] line-clamp-1 mb-3">{description}</p>
      )}

      {visibleChars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {visibleChars.map((name) => (
            <span key={name} className="rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-0.5 text-[11px] text-[#888888]">
              {name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-0.5 text-[11px] text-[#555555]">
              +{extraCount} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-[#444444]">
        <span>{documentCount} {documentCount === 1 ? 'file' : 'files'}</span>
        <span>{formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
      </div>
    </Link>
  )
}
