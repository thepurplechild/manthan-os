import { redirect } from 'next/navigation'
import { requireFounder } from '@/app/actions/profile'
import { getAllDeals } from '@/app/actions/dealPipeline'
import { DealPipelineBoard } from '@/components/founder/DealPipelineBoard'

export default async function DealPipelinePage() {
  try {
    await requireFounder()
  } catch (error) {
    redirect('/dashboard')
  }

  const deals = await getAllDeals()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600 mt-2">Track and manage all deals across projects</p>
        </div>
      </div>

      {/* Pipeline Board */}
      <DealPipelineBoard initialDeals={deals} />
    </div>
  )
}

