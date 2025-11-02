import { redirect } from 'next/navigation'
import { requireFounder } from '@/app/actions/profile'
import { getPlatformMandates } from '@/app/actions/platformMandates'
import { MandatesList } from '@/components/founder/MandatesList'

export default async function PlatformMandatesPage() {
  try {
    await requireFounder()
  } catch (error) {
    redirect('/dashboard')
  }

  const mandates = await getPlatformMandates()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Mandates</h1>
          <p className="text-gray-600 mt-2">Manage market intelligence and platform content requirements</p>
        </div>
      </div>

      {/* Mandates List */}
      <MandatesList initialMandates={mandates} />
    </div>
  )
}

