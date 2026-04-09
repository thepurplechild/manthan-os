'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Home,
  FileText,
  Upload,
  Settings,
  Sparkles,
  Menu,
  X,
  LogOut,
  User,
  FolderOpen
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

const navigation = [
  { name: 'New Story', href: '/dashboard/new', icon: Sparkles },
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Upload', href: '/dashboard/upload', icon: Upload },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface UserProfile {
  id: string
  email: string | null
  fullName: string
  avatarUrl?: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  const isProjectBoard = Boolean(pathname.match(/\/dashboard\/projects\/[a-f0-9-]{36}$/))

  if (isProjectBoard) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#111111] border-r border-[#222222] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#222222]">
          <h1 className="text-xl font-light text-[#E5E5E5]">Manthan OS</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-[8px] text-[#A3A3A3] hover:text-[#E5E5E5]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  {item.name === 'New Story' ? (
                    <Link
                      href={item.href}
                      className="flex items-center px-4 py-3 text-sm font-medium rounded-[8px] bg-[rgba(200,169,126,0.15)] text-[#C8A97E] hover:bg-[rgba(200,169,126,0.22)] transition-colors duration-150"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="mr-3 h-5 w-5 text-[#C8A97E]" />
                      {item.name}
                    </Link>
                  ) : (
                  <Link
                    href={item.href}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-[8px] transition-colors duration-150
                      ${isActive
                        ? 'bg-[rgba(200,169,126,0.15)] text-[#C8A97E]'
                        : 'text-[#E5E5E5] hover:bg-[#1A1A1A] hover:text-[#E5E5E5]'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-[#C8A97E]' : 'text-[#8A8A8A]'}`} />
                    {item.name}
                  </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 px-6 bg-[#0A0A0A] border-b border-[#222222]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-[8px] text-[#A3A3A3] hover:text-[#E5E5E5]"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-lg font-light text-[#E5E5E5] lg:block hidden">
              Manthan OS
            </span>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-3 text-sm rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#C8A97E]/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                <AvatarFallback className="bg-[#1A1A1A] text-[#E5E5E5]">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              {!loading && user && (
                <span className="hidden lg:block text-[#E5E5E5] font-medium">
                  {user.fullName}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#111111] border-[#222222] text-[#E5E5E5]">
              {user && (
                <>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-[#E5E5E5]">{user.fullName}</p>
                    <p className="text-sm text-[#8A8A8A]">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer focus:bg-[#1A1A1A] focus:text-[#E5E5E5]">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Page content */}
        <main className="p-6 bg-[#0A0A0A]">
          {children}
        </main>
      </div>
    </div>
  )
}