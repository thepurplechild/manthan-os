'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  TrendingUp,
  Menu,
  X,
  LogOut,
  User,
  Shield,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getUserProfile, logout } from '@/app/actions/auth'

const founderNavigation = [
  { name: 'Dashboard', href: '/dashboard/founder', icon: LayoutDashboard },
  { name: 'All Projects', href: '/dashboard/founder/projects', icon: FolderOpen },
  { name: 'Platform Mandates', href: '/dashboard/founder/mandates', icon: FileText },
  { name: 'Deal Pipeline', href: '/dashboard/founder/pipeline', icon: TrendingUp },
]

interface UserProfile {
  id: string
  email: string | null
  fullName: string
  avatarUrl?: string
}

export function FounderDashboardNav() {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getUserProfile()
        setUser(profile)
      } catch (error) {
        console.error('Failed to load user profile:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-semibold text-gray-900">Founder</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {founderNavigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard/founder' && pathname.startsWith(item.href))
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150
                      ${isActive
                        ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User menu at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-3 w-full text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 p-2 hover:bg-gray-50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              {!loading && user && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-500">Founder</p>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-purple-600 font-medium mt-1">Founder Role</p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Creator Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Top bar */}
      <div className="fixed top-0 right-0 left-64 h-16 bg-white border-b z-30 lg:block hidden">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-semibold text-gray-900">
              Founder Command Center
            </span>
          </div>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="fixed top-0 right-0 left-0 h-16 bg-white border-b z-30 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            Founder Center
          </span>
          <div className="w-9" /> {/* Spacer for alignment */}
        </div>
      </div>
    </>
  )
}

