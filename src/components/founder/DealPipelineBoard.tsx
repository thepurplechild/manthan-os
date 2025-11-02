'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MessageSquare, CheckCircle2, XCircle, Filter, Search } from 'lucide-react'
import { updateDealStatus } from '@/app/actions/dealPipeline'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type DealPipeline = Database['public']['Tables']['deal_pipeline']['Row']
type DealStatus = DealPipeline['status']

interface DealPipelineBoardProps {
  initialDeals: DealPipeline[]
}

const statusConfig: Record<DealStatus, { label: string; icon: React.ReactNode; color: string }> = {
  introduced: {
    label: 'Introduced',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  in_discussion: {
    label: 'In Discussion',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  },
  deal_closed: {
    label: 'Deal Closed',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  passed: {
    label: 'Passed',
    icon: <XCircle className="h-4 w-4" />,
    color: 'bg-red-50 border-red-200 text-red-700',
  },
}

export function DealPipelineBoard({ initialDeals }: DealPipelineBoardProps) {
  const [deals, setDeals] = useState<DealPipeline[]>(initialDeals)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all')
  const router = useRouter()

  const handleStatusChange = async (dealId: string, newStatus: DealStatus) => {
    const result = await updateDealStatus(dealId, newStatus)
    if (result.success && result.data) {
      setDeals(deals.map(d => d.id === dealId ? result.data! : d))
      router.refresh()
    }
  }

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !searchQuery || 
      deal.target_buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.feedback_notes?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const dealsByStatus = {
    introduced: filteredDeals.filter(d => d.status === 'introduced'),
    in_discussion: filteredDeals.filter(d => d.status === 'in_discussion'),
    deal_closed: filteredDeals.filter(d => d.status === 'deal_closed'),
    passed: filteredDeals.filter(d => d.status === 'passed'),
  }

  if (viewMode === 'table') {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DealStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
          <Button
            variant={viewMode === 'kanban' ? 'outline' : 'default'}
            onClick={() => setViewMode('kanban')}
          >
            Kanban View
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Pipeline ({filteredDeals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Buyer/Platform</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Project</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Feedback</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Updated</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No deals found
                      </td>
                    </tr>
                  ) : (
                    filteredDeals.map((deal) => (
                      <tr key={deal.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{deal.target_buyer_name}</td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/founder/projects/${deal.project_id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Project
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={statusConfig[deal.status].color}>
                            {statusConfig[deal.status].icon}
                            <span className="ml-1">{statusConfig[deal.status].label}</span>
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                          {deal.feedback_notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(deal.updated_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={deal.status}
                            onChange={(e) => handleStatusChange(deal.id, e.target.value as DealStatus)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {Object.entries(statusConfig).map(([status, config]) => (
                              <option key={status} value={status}>{config.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DealStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([status, config]) => (
            <option key={status} value={status}>{config.label}</option>
          ))}
        </select>
        <Button
          variant={viewMode === 'table' ? 'outline' : 'default'}
          onClick={() => setViewMode('table')}
        >
          Table View
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const statusDeals = dealsByStatus[status as DealStatus]
          return (
            <Card key={status} className={config.color}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {config.icon}
                    {config.label}
                  </CardTitle>
                  <Badge variant="secondary">{statusDeals.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {statusDeals.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No deals</p>
                ) : (
                  statusDeals.map((deal) => (
                    <Card key={deal.id} className="bg-white border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{deal.target_buyer_name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Link
                          href={`/dashboard/founder/projects/${deal.project_id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 mb-2 block"
                        >
                          View Project →
                        </Link>
                        {deal.feedback_notes && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {deal.feedback_notes}
                          </p>
                        )}
                        <select
                          value={deal.status}
                          onChange={(e) => handleStatusChange(deal.id, e.target.value as DealStatus)}
                          className="text-xs w-full border border-gray-300 rounded px-2 py-1"
                        >
                          {Object.entries(statusConfig).map(([s, cfg]) => (
                            <option key={s} value={s}>{cfg.label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(deal.updated_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

