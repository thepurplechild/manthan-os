import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, CheckCircle, Sparkles } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Fetch document stats
  const { count: totalDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  const { count: processingDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('processing_status', 'PROCESSING')

  const { count: completedDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('processing_status', 'COMPLETED')

  const stats = [
    {
      title: 'Total Documents',
      value: totalDocs || 0,
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Processing',
      value: processingDocs || 0,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Completed',
      value: completedDocs || 0,
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-8">
      <Card className="border-amber-200 bg-amber-50/70">
        <CardContent className="py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-700" />
              Start with New Story
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Open Manthan conversation mode to shape an idea into a complete story package.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/new">New Story</Link>
          </Button>
        </CardContent>
      </Card>

      <div>
        <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || 'there'}!</h1>
        <p className="text-muted-foreground mt-2">
         Here&apos;s an overview of your document processing activity.
        </p>
      </div>

      {/* Global Semantic Search would need to be implemented separately
          For now, semantic search is available in individual document views */}

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {totalDocs === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Get started by uploading your first document to begin processing and analysis.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard/upload">Upload your first document</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}