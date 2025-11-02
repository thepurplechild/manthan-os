import { requireFounder } from '@/lib/utils/roleGuards'
import Link from 'next/link'
import { LayoutDashboard, FolderOpen, Target, TrendingUp } from 'lucide-react'

export default async function FounderLayout({
  children,
}: {
  children: React.Node
}) {
  // Protect this layout - redirect if not founder
  await requireFounder()

  const navigation = [
    { name: 'Overview', href: '/dashboard/founder', icon: LayoutDashboard },
    { name: 'All Projects', href: '/dashboard/founder/projects', icon: FolderOpen },
    { name: 'Mandates', href: '/dashboard/founder/mandates', icon: Target },
    { name: 'Deal Pipeline', href: '/dashboard/founder/pipeline', icon: TrendingUp },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white">
        <div className="p-6">
          <h2 className="text-2xl font-bold">Founder Center</h2>
          <p className="text-sm text-slate-400 mt-1">Command & Control</p>
        </div>

        <nav className="mt-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-6 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Back to Creator Dashboard */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Creator View
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50">
        <div className="container mx-auto py-8 px-6">
          {children}
        </div>
      </main>
    </div>
  )
}

