import { redirect } from 'next/navigation'
import { getFounderDashboardData } from '@/app/actions/founderDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, TrendingUp, FileText, CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function FounderDashboardPage() {
  let dashboardData
  try {
    dashboardData = await getFounderDashboardData()
  } catch (error) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Founder Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of all projects, deals, and platform mandates</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Across all creators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalActiveDeals}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.successRate !== null ? `${dashboardData.successRate}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Deals closed vs passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Mandates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.platformMandatesCount}</div>
            <p className="text-xs text-muted-foreground">Market intelligence entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Deal Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Pipeline Status</CardTitle>
          <CardDescription>Current status of all deals in the pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Introduced</p>
                <p className="text-2xl font-bold text-blue-700">{dashboardData.dealsByStatus.introduced}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-900">In Discussion</p>
                <p className="text-2xl font-bold text-yellow-700">{dashboardData.dealsByStatus.in_discussion}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Deal Closed</p>
                <p className="text-2xl font-bold text-green-700">{dashboardData.dealsByStatus.deal_closed}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Passed</p>
                <p className="text-2xl font-bold text-red-700">{dashboardData.dealsByStatus.passed}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest projects from creators</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/founder/projects">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardData.recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/founder/projects/${project.id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{project.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          by {project.owner_name || 'Unknown'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Deals</CardTitle>
              <CardDescription>Latest activity in the pipeline</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/founder/pipeline">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardData.recentDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No deals yet</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/dashboard/founder/pipeline`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deal.target_buyer_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Status: <span className="capitalize">{deal.status.replace('_', ' ')}</span>
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        deal.status === 'deal_closed' ? 'bg-green-100 text-green-700' :
                        deal.status === 'in_discussion' ? 'bg-yellow-100 text-yellow-700' :
                        deal.status === 'passed' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {deal.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

