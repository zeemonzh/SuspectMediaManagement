'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner, { LoadingDots } from '@/components/LoadingSpinner'

// Prevent page caching
export const dynamic = 'force-dynamic'

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
      // Force initial fetch
      fetchDashboardStats()
      fetchRecentActivity()
      
      // Set up auto-refresh intervals
      const statsInterval = setInterval(fetchDashboardStats, 60000) // Every minute
      const activityInterval = setInterval(fetchRecentActivity, 30000) // Every 30 seconds
      
      return () => {
        clearInterval(statsInterval)
        clearInterval(activityInterval)
      }
    }
  }, [isAdmin])

  // Add effect to refresh data when the component becomes visible
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isAdmin) {
          fetchDashboardStats()
          fetchRecentActivity()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', () => {
        if (isAdmin) {
          fetchDashboardStats()
          fetchRecentActivity()
        }
      })

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', () => {})
      }
    }
  }, [isAdmin])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard-stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        },
        next: {
          revalidate: 0
        }
      })
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
      const response = await fetch('/api/recent-activity', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        },
        next: {
          revalidate: 0
        }
      })
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
    return <LoadingSpinner fullScreen text="Loading admin dashboard" />
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
      description: 'View and toggle streamer status',
      href: '/admin/streamers',
      icon: '👤'
    },
    {
      title: 'Stream Sessions',
      description: 'Monitor live streams and history',
      href: '/admin/sessions',
      icon: '📺'
    },
    {
      title: 'Payouts',
      description: 'Approve and process payments',
      href: '/admin/payouts',
      icon: '💳'
    },
    {
      title: 'Product Keys',
      description: 'Manage 24h keys and requests',
      href: '/admin/keys',
      icon: '🔐'
    },
    {
      title: 'Goals & Analytics',
      description: 'Configure goals and metrics',
      href: '/admin/analytics',
      icon: '📊'
    },
    {
      title: 'Settings',
      description: 'Users, invites, and activity logs',
      href: '/admin/settings',
      icon: '⚙️'
    }
  ]

  return (
    <div className="min-h-screen bg-suspect-body">
      {/* Header */}
      <header className="bg-suspect-header border-b border-suspect-gray-700 animate-slide-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center animate-fade-in min-w-0 flex-1">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-suspect-text hover:text-suspect-primary transition-colors duration-300 truncate">
                SuspectCheats
              </Link>
              <span className="hidden sm:block ml-2 text-suspect-gray-400 animate-fade-in stagger-1">Admin Panel</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 animate-fade-in stagger-2">
              <span className="hidden md:block text-suspect-gray-400 text-sm">Welcome, {streamer?.username || user?.email || 'Admin'}</span>
              <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1 sm:px-4 sm:py-2">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-container">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-suspect-text">Dashboard</h1>
          <p className="text-suspect-gray-400 mt-2 animate-slide-up stagger-1">
            Overview of your streamer management platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div 
              key={index} 
              className={`stat-card animate-scale-in stagger-${Math.min(index + 1, 6)} group hover:shadow-lg hover:shadow-suspect-primary/20`}
            >
              <div className="flex items-center">
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl mr-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-suspect-gray-400 text-sm group-hover:text-suspect-gray-300 transition-colors duration-300">{card.title}</p>
                  <div className="text-2xl font-bold text-suspect-text group-hover:text-suspect-primary transition-colors duration-300">
                    {loadingStats ? (
                      <LoadingDots size="sm" />
                    ) : (
                      <span className="animate-fade-in">{card.value}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8 animate-fade-in-up stagger-3">
          <h2 className="text-xl font-semibold text-suspect-text mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link 
                key={index}
                href={action.href}
                className={`quick-action-card animate-scale-in stagger-${Math.min(index + 4, 6)} group hover:shadow-lg hover:shadow-suspect-primary/20`}
              >
                <div className="flex items-start">
                  <div className="text-2xl mr-3 group-hover:scale-110 group-hover:bounce transition-all duration-300">{action.icon}</div>
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
        <div className="card p-6 animate-fade-in-up stagger-6 hover:shadow-lg hover:shadow-suspect-gray-700/30 transition-all duration-300">
          <h2 className="text-xl font-semibold text-suspect-text mb-4">Recent Stream Activity</h2>
          {loadingActivity ? (
            <div className="text-center text-suspect-gray-400 py-8">
              <div className="flex flex-col items-center space-y-3">
                <LoadingDots size="lg" />
                <span className="text-suspect-gray-400">Loading activity</span>
              </div>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center text-suspect-gray-400 py-8 animate-fade-in">No recent activity</div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between py-3 border-b border-suspect-gray-700 last:border-b-0 hover:bg-suspect-gray-800/30 rounded-lg px-2 transition-all duration-200 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 ${activity.color} rounded-full mr-3 animate-pulse`}></div>
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