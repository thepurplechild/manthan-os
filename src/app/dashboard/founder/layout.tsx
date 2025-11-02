import { redirect } from 'next/navigation'
import { requireFounder } from '@/app/actions/profile'
import { FounderDashboardNav } from '@/components/founder/FounderDashboardNav'

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side role check - redirects if not founder
  try {
    await requireFounder()
  } catch (error) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FounderDashboardNav />
      <main className="lg:pl-64">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

