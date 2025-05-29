'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/LoadingSpinner'

interface StreamSession {
  id: string
  streamer_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  average_viewers?: number
  total_viewers?: number
  peak_viewers?: number
  payout_amount?: number
  admin_notes?: string
  streamers: {
    username: string
    tiktok_username: string
  }
  is_live: boolean
}

interface StreamStats {
  totalSessions: number
  activeSessions: number
  totalHours: number
  avgViewers: number
  totalPayouts: number
}

export default function AdminSessions() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<StreamSession[]>([])
  const [liveSessions, setLiveSessions] = useState<StreamSession[]>([])
  const [stats, setStats] = useState<StreamStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalHours: 0,
    avgViewers: 0,
    totalPayouts: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live')
  const [selectedSession, setSelectedSession] = useState<StreamSession | null>(null)
  const [showSessionModal, setShowSessionModal] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [streamerFilter, setStreamerFilter] = useState('')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [sortBy, setSortBy] = useState<'start_time' | 'duration' | 'viewers'>('start_time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/login')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (isAdmin) {
      fetchData()
      // Set up real-time updates for live sessions
      const interval = setInterval(fetchLiveSessions, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin) {
      fetchStreamSessions()
    }
  }, [searchTerm, streamerFilter, dateRange, sortBy, sortOrder])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchStreamStats(),
        fetchLiveSessions(),
        fetchStreamSessions()
      ])
    } catch (error) {
      console.error('Error fetching session data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStreamStats = async () => {
    try {
      const response = await fetch('/api/admin/session-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stream stats:', error)
    }
  }

  const fetchLiveSessions = async () => {
    try {
      const response = await fetch('/api/admin/live-sessions')
      if (response.ok) {
        const data = await response.json()
        setLiveSessions(data)
      }
    } catch (error) {
      console.error('Error fetching live sessions:', error)
    }
  }

  const fetchStreamSessions = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        streamer: streamerFilter,
        dateRange,
        sortBy,
        sortOrder
      })
      
      const response = await fetch(`/api/admin/stream-sessions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Error fetching stream sessions:', error)
    }
  }



  const updateSessionNotes = async (sessionId: string, notes: string) => {
    try {
      const response = await fetch(`/api/admin/stream-sessions/${sessionId}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_notes: notes })
      })

      if (response.ok) {
        alert('Session notes updated successfully')
        fetchStreamSessions()
        setShowSessionModal(false)
      } else {
        alert('Error updating session notes')
      }
    } catch (error) {
      console.error('Error updating notes:', error)
      alert('Error updating session notes')
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getCurrentDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return formatDuration(diffMins)
  }

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen text="Loading stream sessions" />
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-suspect-body">
      {/* Header */}
      <header className="bg-suspect-header border-b border-suspect-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center min-w-0 flex-1">
              <Link href="/admin" className="text-xl sm:text-2xl font-bold text-suspect-text truncate">
                SuspectCheats
              </Link>
              <span className="hidden sm:block ml-2 text-suspect-gray-400">/ Stream Sessions</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/admin" className="btn-secondary text-sm px-3 py-1 sm:px-4 sm:py-2">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-suspect-text">Stream Sessions</h1>
          <p className="text-suspect-gray-400 mt-2">
            Monitor live streams and manage session history
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-suspect-primary/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-suspect-text group-hover:scale-110 transition-transform duration-300">{stats.totalSessions}</p>
              <p className="text-suspect-gray-400 text-sm">Total Sessions</p>
            </div>
          </div>
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-red-400/10 group">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <p className="text-2xl font-bold text-red-400 group-hover:scale-110 transition-transform duration-300">{stats.activeSessions}</p>
              </div>
              <p className="text-suspect-gray-400 text-sm">Live Now</p>
            </div>
          </div>
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-blue-400/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400 group-hover:scale-110 transition-transform duration-300">{stats.totalHours}h</p>
              <p className="text-suspect-gray-400 text-sm">Total Hours</p>
            </div>
          </div>
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-green-400/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400 group-hover:scale-110 transition-transform duration-300">{stats.avgViewers.toLocaleString()}</p>
              <p className="text-suspect-gray-400 text-sm">Avg Viewers</p>
            </div>
          </div>
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-suspect-primary/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-suspect-primary group-hover:scale-110 transition-transform duration-300">${stats.totalPayouts.toFixed(2)}</p>
              <p className="text-suspect-gray-400 text-sm">Total Payouts</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-suspect-gray-700 mb-8">
          <nav className="-mb-px flex">
            {[
              { id: 'live', name: `Live Streams (${stats.activeSessions})`, icon: '🔴', shortName: `Live (${stats.activeSessions})` },
              { id: 'history', name: 'Session History', icon: '📊', shortName: 'History' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 flex-1 justify-center sm:justify-start sm:flex-none ${
                  activeTab === tab.id
                    ? 'border-suspect-primary text-suspect-primary'
                    : 'border-transparent text-suspect-gray-400 hover:text-suspect-text hover:border-suspect-gray-300'
                }`}
              >
                <span className="text-sm sm:text-base">{tab.icon}</span>
                <span className="sm:hidden">{tab.shortName}</span>
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Live Streams Tab */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <h2 className="text-xl font-semibold text-suspect-text">Live Streams</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-suspect-gray-400 text-sm">Auto-refreshing every 30s</span>
              </div>
            </div>

            {liveSessions.length === 0 ? (
              <div className="card p-12">
                <div className="text-center text-suspect-gray-400">
                  <div className="text-6xl mb-4">📺</div>
                  <h3 className="text-xl font-medium text-suspect-text mb-2">No Live Streams</h3>
                  <p>No streamers are currently live. Live streams will appear here automatically.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {liveSessions.map((session, index) => (
                  <div 
                    key={session.id} 
                    className="card p-6 border-l-4 border-red-500 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 animate-in slide-in-from-bottom-5"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-suspect-text">
                          {session.streamers.username}
                        </h3>
                        <p className="text-suspect-gray-400 text-sm">
                          @{session.streamers.tiktok_username}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-400 text-sm font-medium">LIVE</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-suspect-gray-400 text-xs">Duration</p>
                        <p className="text-suspect-text font-medium">
                          {getCurrentDuration(session.start_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-suspect-gray-400 text-xs">Current Viewers</p>
                        <p className="text-suspect-text font-medium">
                          {session.total_viewers?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-suspect-gray-400 text-xs">Started</p>
                        <p className="text-suspect-text font-medium text-xs">
                          {formatTimestamp(session.start_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-suspect-gray-400 text-xs">Peak Viewers</p>
                        <p className="text-suspect-text font-medium">
                          {session.peak_viewers?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSession(session)
                          setShowSessionModal(true)
                        }}
                        className="btn-secondary text-xs flex-1 hover:scale-105 transition-all duration-200"
                      >
                        View Details
                      </button>
                      <a
                        href={`https://www.tiktok.com/@${session.streamers.tiktok_username}/live`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#ff0050] hover:bg-[#e6004a] hover:scale-105 text-white px-3 py-1 rounded text-xs flex items-center justify-center transition-all duration-200"
                      >
                        View on TikTok
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Session History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="card p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-suspect-text mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search streamer..."
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-suspect-text mb-2">
                    Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="input-field w-full"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-suspect-text mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="input-field w-full"
                  >
                    <option value="start_time">Start Time</option>
                    <option value="duration">Duration</option>
                    <option value="viewers">Avg Viewers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-suspect-text mb-2">
                    Order
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="input-field w-full"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="card p-6">
              <div className="overflow-x-auto">
                <div className="max-h-[500px] overflow-y-auto border border-suspect-gray-700 rounded-lg">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-suspect-header z-10">
                      <tr className="border-b border-suspect-gray-700">
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Streamer</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Start Time</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Duration</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Avg Viewers</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Peak Viewers</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Payout</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Status</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                          <td className="text-suspect-text py-4 px-4 font-medium">
                            <div>
                              <div>{session.streamers.username}</div>
                              <div className="text-sm text-suspect-gray-400">{session.streamers.tiktok_username}</div>
                            </div>
                          </td>
                          <td className="text-suspect-gray-400 py-4 px-4">
                            {formatTimestamp(session.start_time)}
                          </td>
                          <td className="text-suspect-text py-4 px-4">
                            {session.is_live ? getCurrentDuration(session.start_time) : formatDuration(session.duration_minutes)}
                          </td>
                          <td className="text-suspect-text py-4 px-4">
                            {session.average_viewers?.toLocaleString() || '-'}
                          </td>
                          <td className="text-suspect-text py-4 px-4">
                            {session.peak_viewers?.toLocaleString() || '-'}
                          </td>
                          <td className="text-suspect-text py-4 px-4">
                            {session.payout_amount ? `$${session.payout_amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.is_live 
                                ? 'bg-red-500/20 text-red-400 animate-pulse' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {session.is_live ? 'Live' : 'Completed'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => {
                                setSelectedSession(session)
                                setShowSessionModal(true)
                              }}
                              className="text-suspect-primary hover:text-suspect-primary-light text-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sessions.length === 0 && (
                  <div className="text-center text-suspect-gray-400 py-8">
                    No sessions found matching your criteria.
                  </div>
                )}
                {sessions.length > 8 && (
                  <div className="text-center text-suspect-gray-400 text-sm mt-2">
                    Showing {sessions.length} sessions • Scroll to view more
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {showSessionModal && selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => {
            setShowSessionModal(false)
            setSelectedSession(null)
          }}
          onUpdateNotes={updateSessionNotes}
        />
      )}
    </div>
  )
}

// Session Details Modal Component
function SessionDetailsModal({
  session,
  onClose,
  onUpdateNotes
}: {
  session: StreamSession
  onClose: () => void
  onUpdateNotes: (sessionId: string, notes: string) => void
}) {
  const [notes, setNotes] = useState(session.admin_notes || '')

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getCurrentDuration = () => {
    if (!session.is_live) return formatDuration(session.duration_minutes)
    const start = new Date(session.start_time)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return formatDuration(diffMins)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-black opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-suspect-body rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-suspect-gray-700 animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="bg-suspect-header px-6 pt-6 pb-4 border-b border-suspect-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium text-suspect-text">Session Details</h3>
              <button
                onClick={onClose}
                className="text-suspect-gray-400 hover:text-suspect-text"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="px-6 pt-6 pb-4 space-y-6">
            {/* Streamer Info */}
            <div>
              <h4 className="text-lg font-medium text-suspect-text mb-3">Streamer</h4>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-suspect-text font-medium">{session.streamers.username}</p>
                    <p className="text-suspect-gray-400">@{session.streamers.tiktok_username}</p>
                    {session.is_live && (
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                        <span className="text-red-400 text-sm font-medium">Currently Live</span>
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://www.tiktok.com/@${session.streamers.tiktok_username}/live`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#ff0050] hover:bg-[#e6004a] text-white px-3 py-2 rounded text-sm font-medium"
                  >
                    View on TikTok
                  </a>
                </div>
              </div>
            </div>

            {/* Session Metrics */}
            <div>
              <h4 className="text-lg font-medium text-suspect-text mb-3">Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <p className="text-suspect-gray-400 text-sm">Duration</p>
                  <p className="text-suspect-text font-bold text-xl">
                    {getCurrentDuration()}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-suspect-gray-400 text-sm">Average Viewers</p>
                  <p className="text-suspect-text font-bold text-xl">
                    {session.average_viewers?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-suspect-gray-400 text-sm">Peak Viewers</p>
                  <p className="text-suspect-text font-bold text-xl">
                    {session.peak_viewers?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-suspect-gray-400 text-sm">Payout Amount</p>
                  <p className="text-suspect-text font-bold text-xl">
                    ${session.payout_amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-lg font-medium text-suspect-text mb-3">Timeline</h4>
              <div className="card p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-suspect-gray-400">Started:</span>
                  <span className="text-suspect-text">
                    {new Date(session.start_time).toLocaleString()}
                  </span>
                </div>
                {session.end_time && (
                  <div className="flex justify-between">
                    <span className="text-suspect-gray-400">Ended:</span>
                    <span className="text-suspect-text">
                      {new Date(session.end_time).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-suspect-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    session.is_live 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {session.is_live ? 'Live' : 'Completed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <h4 className="text-lg font-medium text-suspect-text mb-3">Admin Notes</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add administrative notes about this session..."
                className="input-field w-full h-24 resize-none"
              />
            </div>
          </div>

          <div className="bg-suspect-header px-6 py-4 flex justify-end space-x-3 border-t border-suspect-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-suspect-gray-700 hover:bg-suspect-gray-600 text-suspect-gray-300 rounded font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onUpdateNotes(session.id, notes)}
              className="btn-primary"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 