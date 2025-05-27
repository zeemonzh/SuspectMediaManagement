'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardStats {
  totalStreamers: number
  activeStreams: number
  pendingPayouts: number
  pendingKeyRequests: number
  totalHours: number
  avgViewers: number
}

interface Activity {
  id: string
  type: string
  message: string
  timestamp: string
  color: string
}

export default function AdminDashboard() {
  const { user, streamer, signOut, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalStreamers: 0,
    activeStreams: 0,
    pendingPayouts: 0,
    pendingKeyRequests: 0,
    totalHours: 0,
    avgViewers: 0
  })
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login')
    }
  }, [user, isAdmin, loading, router])

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardStats()
      fetchRecentActivity()
    }
  }, [isAdmin])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/recent-activity')
      if (response.ok) {
        const data = await response.json()
        setRecentActivity(data)
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoadingActivity(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diffMs = now.getTime() - activityTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return activityTime.toLocaleDateString()
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-suspect-body flex items-center justify-center">
        <div className="text-suspect-text">Loading...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const statCards = [
    {
      title: 'Total Streamers',
      value: stats.totalStreamers,
      icon: '👥',
      color: 'bg-blue-500'
    },
    {
      title: 'Active Streams',
      value: stats.activeStreams,
      icon: '🔴',
      color: 'bg-green-500'
    },
    {
      title: 'Pending Payouts',
      value: stats.pendingPayouts,
      icon: '💰',
      color: 'bg-yellow-500'
    },
    {
      title: 'Key Requests',
      value: stats.pendingKeyRequests,
      icon: '🔑',
      color: 'bg-purple-500'
    },
    {
      title: 'Total Hours (Week)',
      value: `${stats.totalHours}h`,
      icon: '⏱️',
      color: 'bg-indigo-500'
    },
    {
      title: 'Avg Viewers',
      value: stats.avgViewers.toLocaleString(),
      icon: '👀',
      color: 'bg-pink-500'
    }
  ]

  const quickActions = [
    {
      title: 'Manage Streamers',
      description: 'Add, edit, or deactivate streamer accounts',
      href: '/admin/streamers',
      icon: '👤'
    },
    {
      title: 'Stream Sessions',
      description: 'View live streams and session history',
      href: '/admin/sessions',
      icon: '📺'
    },
    {
      title: 'Payouts',
      description: 'Review and process streamer payments',
      href: '/admin/payouts',
      icon: '💳'
    },
    {
      title: 'Product Keys',
      description: 'Manage product keys and requests',
      href: '/admin/keys',
      icon: '🔐'
    },
    {
      title: 'Goals & Analytics',
      description: 'Set goals and view performance analytics',
      href: '/admin/analytics',
      icon: '📊'
    },
    {
      title: 'Settings',
      description: 'Platform settings and configuration',
      href: '/admin/settings',
      icon: '⚙️'
    }
  ]

  return (
    <div className="min-h-screen bg-suspect-body">
      {/* Header */}
      <header className="bg-suspect-header border-b border-suspect-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-suspect-text">
                SuspectCheats
              </Link>
              <span className="ml-2 text-suspect-gray-400">Admin Panel</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-suspect-gray-400">Welcome, {streamer?.username || user?.email || 'Admin'}</span>
              <button onClick={handleLogout} className="btn-secondary">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-suspect-text">Dashboard</h1>
          <p className="text-suspect-gray-400 mt-2">
            Overview of your streamer management platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div 
              key={index} 
              className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-suspect-primary/10 group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center">
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl mr-4 group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-suspect-gray-400 text-sm">{card.title}</p>
                  <p className="text-2xl font-bold text-suspect-text group-hover:text-suspect-primary transition-colors duration-300">
                    {loadingStats ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <span className="animate-in fade-in duration-500">{card.value}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-suspect-text mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link 
                key={index}
                href={action.href}
                className="card p-6 hover:bg-suspect-gray-800 hover:scale-105 hover:shadow-lg hover:shadow-suspect-primary/10 transition-all duration-300 group"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <div className="flex items-start">
                  <div className="text-2xl mr-3 group-hover:scale-110 transition-transform duration-300">{action.icon}</div>
                  <div>
                    <h3 className="text-lg font-medium text-suspect-text mb-1 group-hover:text-suspect-primary transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-suspect-gray-400 text-sm group-hover:text-suspect-gray-300 transition-colors duration-300">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-suspect-text mb-4">Recent Stream Activity</h2>
          {loadingActivity ? (
            <div className="text-center text-suspect-gray-400 py-8">Loading activity...</div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center text-suspect-gray-400 py-8">No recent activity</div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b border-suspect-gray-700 last:border-b-0">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 ${activity.color} rounded-full mr-3`}></div>
                    <span className="text-suspect-text">{activity.message}</span>
                  </div>
                  <span className="text-suspect-gray-400 text-sm">{formatTimestamp(activity.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 