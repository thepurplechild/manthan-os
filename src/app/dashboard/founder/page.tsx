import { getFounderDashboardData } from '@/app/actions/founderDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, Target, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default async function FounderDashboardPage() {
  const data = await getFounderDashboardData()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Founder Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all projects, deals, and market intelligence
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all creators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalActiveDeals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In progress or introduced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Mandates</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.platformMandatesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Market intelligence entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.successRate !== null ? `${data.successRate}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Closed vs. passed deals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deal Pipeline Status */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {data.dealsByStatus.introduced}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Introduced</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {data.dealsByStatus.in_discussion}
              </div>
              <div className="text-sm text-muted-foreground mt-1">In Discussion</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {data.dealsByStatus.deal_closed}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Deal Closed</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {data.dealsByStatus.passed}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Passed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Projects</CardTitle>
          <Link
            href="/dashboard/founder/projects"
            className="text-sm text-primary hover:underline"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {data.recentProjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No projects yet
            </p>
          ) : (
            <div className="space-y-4">
              {data.recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/founder/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.title}
                    </Link>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description.slice(0, 100)}
                        {project.description.length > 100 && '...'}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        {project.owner_name || 'Unknown Creator'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Deal Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Deal Activity</CardTitle>
          <Link
            href="/dashboard/founder/pipeline"
            className="text-sm text-primary hover:underline"
          >
            View pipeline →
          </Link>
        </CardHeader>
        <CardContent>
          {data.recentDeals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No deals in pipeline yet
            </p>
          ) : (
            <div className="space-y-4">
              {data.recentDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{deal.target_buyer_name}</div>
                    {deal.feedback_notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {deal.feedback_notes.slice(0, 100)}
                        {deal.feedback_notes.length > 100 && '...'}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      Updated {new Date(deal.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant={
                      deal.status === 'deal_closed'
                        ? 'default'
                        : deal.status === 'in_discussion'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {deal.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

