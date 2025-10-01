'use client'

import { useEffect, useState } from 'react'
import { FileText, Clock, CheckCircle, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserProfile } from '@/app/actions/auth'

interface UserProfile {
  id: string
  email: string | null
  fullName: string
  avatarUrl?: string
}

interface DashboardStats {
  totalDocuments: number
  processing: number
  completed: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    processing: 0,
    completed: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const profile = await getUserProfile()
        setUser(profile)

        // TODO: Replace with actual API call to get document stats
        // For now, using placeholder data
        setStats({
          totalDocuments: 0,
          processing: 0,
          completed: 0,
        })
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const statsCards = [
    {
      title: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Processing',
      value: stats.processing,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded-md w-2/3"></div>
                <div className="h-8 bg-gray-200 rounded-md w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.fullName || 'User'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here&apos;s an overview of your document processing activity.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty state or recent documents */}
      {stats.totalDocuments === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No documents yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Get started by uploading your first document to begin processing and analysis.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload your first document</span>
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-500 py-8 text-center">
              Recent documents will appear here once you start uploading.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}