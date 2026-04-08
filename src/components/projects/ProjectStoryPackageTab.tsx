'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  CharacterCard,
  GenreToneCard,
  LoglineCard,
  OnePagerCard,
  SynopsisCard,
} from '@/components/story/OutputCards'

type StoryPackageOutputs = {
  logline: string | null
  synopsis: string | null
  genreTone: Record<string, unknown> | null
  characterBreakdown: unknown | null
  onePager: unknown | null
}

interface ProjectStoryPackageTabProps {
  projectId: string
  outputs: StoryPackageOutputs
}

function noopAction() {
  toast.info('Open the New Story experience to generate a revision.')
}

async function noopRefine() {
  toast.info('Open the New Story experience to continue development.')
}

function ContinueDevelopingButton({ projectId }: { projectId: string }) {
  return (
    <div className="flex justify-end">
      <Button asChild variant="ghost" className="h-auto px-0 text-[#C8A97E] hover:bg-transparent hover:underline">
        <Link href={`/dashboard/new?projectId=${projectId}`}>Continue developing -&gt;</Link>
      </Button>
    </div>
  )
}

export function ProjectStoryPackageTab({ projectId, outputs }: ProjectStoryPackageTabProps) {
  const hasCharacterBreakdown = outputs.characterBreakdown !== null && outputs.characterBreakdown !== undefined
  const hasOnePager = outputs.onePager !== null && outputs.onePager !== undefined
  const hasAnyOutput = Boolean(
    outputs.logline || outputs.synopsis || outputs.genreTone || hasCharacterBreakdown || hasOnePager
  )

  if (!hasAnyOutput) {
    return (
      <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-8 text-center">
        <p className="text-[#A3A3A3]">No generated story package yet.</p>
        <Button asChild className="mt-4 bg-[#C8A97E] text-black hover:bg-[#b8976a]">
          <Link href={`/dashboard/new?projectId=${projectId}`}>Continue developing</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {outputs.logline && (
        <div className="space-y-2">
          <LoglineCard title="LOGLINE" content={outputs.logline} onRegenerate={noopAction} onRefine={noopRefine} />
          <ContinueDevelopingButton projectId={projectId} />
        </div>
      )}

      {outputs.genreTone && (
        <div className="space-y-2">
          <GenreToneCard
            title="GENRE + TONE"
            content={outputs.genreTone as { primaryGenre?: string; subGenres?: string[]; tone?: string[] }}
            onRegenerate={noopAction}
            onRefine={noopRefine}
          />
          <ContinueDevelopingButton projectId={projectId} />
        </div>
      )}

      {outputs.synopsis && (
        <div className="space-y-2">
          <SynopsisCard title="SYNOPSIS" content={outputs.synopsis} onRegenerate={noopAction} onRefine={noopRefine} />
          <ContinueDevelopingButton projectId={projectId} />
        </div>
      )}

      {hasCharacterBreakdown && (
        <div className="space-y-2">
          <CharacterCard
            title="CHARACTER BREAKDOWN"
            content={outputs.characterBreakdown}
            onRegenerate={noopAction}
            onRefine={noopRefine}
          />
          <ContinueDevelopingButton projectId={projectId} />
        </div>
      )}

      {hasOnePager && (
        <div className="space-y-2">
          <OnePagerCard title="ONE-PAGER" content={outputs.onePager} onRegenerate={noopAction} onRefine={noopRefine} />
          <ContinueDevelopingButton projectId={projectId} />
        </div>
      )}
    </div>
  )
}
