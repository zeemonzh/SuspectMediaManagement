'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'

interface StreamerAnalytics {
  id: string
  username: string
  totalHours: number
  avgViewers: number
  totalStreams: number
  goalCompletion: number
  goalDetails: {
    completed: number
    total: number
    timeGoalsMet: number
    viewerGoalsMet: number
    fullGoalsMet: number
  }
  growthRate: number
  lastStream: string
}

interface PlatformMetrics {
  totalStreams: number
  totalHours: number
  totalViewers: number
  avgStreamDuration: number
  activeStreamers: number
  monthlyGoalCompletions: number
  growthRates: {
    streams: number
    hours: number
    viewers: number
    activeStreamers: number
  }
}

interface StreamerGoals {
  id?: string
  streamer_id: string
  minimum_duration_minutes: number
  target_viewers: number
  base_payout: number
  partial_payout: number
}

interface Streamer {
  id: string
  username: string
  tiktok_username: string
}

// Component to display streamer goals overview
function StreamerGoalsTable({ allStreamers }: { allStreamers: Streamer[] }) {
  const [streamerGoals, setStreamerGoals] = useState<any[]>([])
  const [systemDefaults, setSystemDefaults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStreamerGoalsData()
  }, [allStreamers])

  const fetchStreamerGoalsData = async () => {
    setLoading(true)
    try {
      // Fetch all streamer goals
      const [goalsResponse, defaultsResponse] = await Promise.all([
        fetch('/api/streamer-goals'),
        fetch('/api/system-defaults')
      ])

      if (goalsResponse.ok) {
        const goals = await goalsResponse.json()
        setStreamerGoals(goals)
      }

      if (defaultsResponse.ok) {
        const defaults = await defaultsResponse.json()
        setSystemDefaults(defaults)
      }
    } catch (error) {
      console.error('Error fetching streamer goals data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading streamer goals" />
  }

  return (
    <div className="overflow-x-auto">
      <div className="max-h-96 overflow-y-auto border border-suspect-gray-700 rounded-lg">
        <table className="w-full">
          <thead className="sticky top-0 bg-suspect-header z-10">
            <tr className="border-b border-suspect-gray-700">
              <th className="text-left text-suspect-gray-400 py-3 px-4">Streamer</th>
              <th className="text-left text-suspect-gray-400 py-3 px-4">Settings Type</th>
              <th className="text-left text-suspect-gray-400 py-3 px-4">Min Duration</th>
              <th className="text-left text-suspect-gray-400 py-3 px-4">Target Viewers</th>
              <th className="text-left text-suspect-gray-400 py-3 px-4">Base Payout</th>
              <th className="text-left text-suspect-gray-400 py-3 px-4">Partial Payout</th>
            </tr>
          </thead>
          <tbody>
            {allStreamers.map((streamer) => {
              const customGoals = streamerGoals.find(g => g.streamer_id === streamer.id)
              const isCustom = !!customGoals
              const goals = isCustom ? customGoals : systemDefaults

              return (
                <tr key={streamer.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                  <td className="text-suspect-text py-4 px-4 font-medium">
                    <div>
                      <div>{streamer.username}</div>
                      <div className="text-sm text-suspect-gray-400">{streamer.tiktok_username}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isCustom 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                        : 'bg-suspect-gray-700 text-suspect-gray-300 border border-suspect-gray-600'
                    }`}>
                      {isCustom ? 'Custom' : 'System Default'}
                    </span>
                  </td>
                  <td className="text-suspect-text py-4 px-4">
                    {goals?.minimum_duration_minutes || systemDefaults?.minimum_duration_minutes || 60} min
                  </td>
                  <td className="text-suspect-text py-4 px-4">
                    {(goals?.target_viewers || systemDefaults?.target_viewers || 1000).toLocaleString()}
                  </td>
                  <td className="text-suspect-text py-4 px-4">
                    ${(goals?.base_payout || systemDefaults?.base_payout || 7.20).toFixed(2)}
                  </td>
                  <td className="text-suspect-text py-4 px-4">
                    ${(goals?.partial_payout || systemDefaults?.partial_payout || 4.50).toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="text-suspect-gray-400">
          Total: {allStreamers.length} streamers
        </div>
        <div className="flex space-x-4">
          <div className="text-suspect-gray-400">
            <span className="inline-block w-3 h-3 bg-blue-500/20 border border-blue-500/30 rounded-full mr-2"></span>
            Custom: {streamerGoals.length}
          </div>
          <div className="text-suspect-gray-400">
            <span className="inline-block w-3 h-3 bg-suspect-gray-700 border border-suspect-gray-600 rounded-full mr-2"></span>
            System Default: {allStreamers.length - streamerGoals.length}
          </div>
        </div>
      </div>
      
      {allStreamers.length > 8 && (
        <div className="text-center text-suspect-gray-400 text-sm mt-2">
          Showing {allStreamers.length} streamers • Scroll to view more
        </div>
      )}
    </div>
  )
}

export default function AdminAnalytics() {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('month')
  const [streamers, setStreamers] = useState<StreamerAnalytics[]>([])
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [allStreamers, setAllStreamers] = useState<Streamer[]>([])
  const [selectedStreamerId, setSelectedStreamerId] = useState<string>('default')
  const [goals, setGoals] = useState<StreamerGoals>({
    streamer_id: '',
    minimum_duration_minutes: 60,
    target_viewers: 1000,
    base_payout: 7.20,
    partial_payout: 4.50
  })
  const [showGoalsOverview, setShowGoalsOverview] = useState(false)
  const [lastAnalyticsFetch, setLastAnalyticsFetch] = useState<number>(0)
  const [lastStreamersFetch, setLastStreamersFetch] = useState<number>(0)

  // Cache durations
  const ANALYTICS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for analytics
  const STREAMERS_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes for streamers list

  useEffect(() => {
    const now = Date.now()
    
    // Only fetch streamers if cache is expired
    if (now - lastStreamersFetch > STREAMERS_CACHE_DURATION) {
      fetchStreamers()
    }
  }, [])

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeframe])

  const fetchAnalyticsData = async () => {
    const now = Date.now()
    
    // Use cache if available and not expired
    if (now - lastAnalyticsFetch < ANALYTICS_CACHE_DURATION && streamers.length > 0) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/analytics?timeframe=${timeframe}`)
      if (response.ok) {
        const data = await response.json()
        setStreamers(data.streamers || [])
        setMetrics(data.metrics)
        setLastAnalyticsFetch(now)
      } else {
        console.error('Failed to fetch analytics data')
        setStreamers([])
        setMetrics(null)
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setStreamers([])
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchStreamers = async () => {
    const now = Date.now()
    
    // Use cache if available and not expired
    if (now - lastStreamersFetch < STREAMERS_CACHE_DURATION && allStreamers.length > 0) {
      return
    }

    try {
      const response = await fetch('/api/streamers')
      if (response.ok) {
        const data = await response.json()
        setAllStreamers(data)
        setLastStreamersFetch(now)
      }
    } catch (error) {
      console.error('Error fetching streamers:', error)
    }
  }

  const handleStreamerChange = async (streamerId: string) => {
    setSelectedStreamerId(streamerId)
    
    if (streamerId === 'default') {
      // Fetch current system defaults
      try {
        const response = await fetch('/api/system-defaults')
        if (response.ok) {
          const systemDefaults = await response.json()
          setGoals({
            streamer_id: '',
            minimum_duration_minutes: systemDefaults.minimum_duration_minutes,
            target_viewers: systemDefaults.target_viewers,
            base_payout: systemDefaults.base_payout,
            partial_payout: systemDefaults.partial_payout
          })
        } else {
          // Fallback to hardcoded defaults
          setGoals({
            streamer_id: '',
            minimum_duration_minutes: 60,
            target_viewers: 1000,
            base_payout: 7.20,
            partial_payout: 4.50
          })
        }
      } catch (error) {
        console.error('Error fetching system defaults:', error)
        // Fallback to hardcoded defaults
        setGoals({
          streamer_id: '',
          minimum_duration_minutes: 60,
          target_viewers: 1000,
          base_payout: 7.20,
          partial_payout: 4.50
        })
      }
    } else {
      // Fetch current goals for selected streamer
      try {
        const response = await fetch('/api/streamer-goals')
        if (response.ok) {
          const allGoals = await response.json()
          const streamerGoals = allGoals.find((g: any) => g.streamer_id === streamerId)
          
          if (streamerGoals) {
            setGoals(streamerGoals)
          } else {
            // Use system defaults for this streamer
            const defaultsResponse = await fetch('/api/system-defaults')
            if (defaultsResponse.ok) {
              const systemDefaults = await defaultsResponse.json()
              setGoals({
                streamer_id: streamerId,
                minimum_duration_minutes: systemDefaults.minimum_duration_minutes,
                target_viewers: systemDefaults.target_viewers,
                base_payout: systemDefaults.base_payout,
                partial_payout: systemDefaults.partial_payout
              })
            } else {
              setGoals({
                streamer_id: streamerId,
                minimum_duration_minutes: 60,
                target_viewers: 1000,
                base_payout: 7.20,
                partial_payout: 4.50
              })
            }
          }
        }
      } catch (error) {
        console.error('Error fetching goals:', error)
      }
    }
  }

  const saveGoals = async () => {
    try {
      let response
      
      if (selectedStreamerId === 'default') {
        // Save system defaults
        response = await fetch('/api/system-defaults', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            minimum_duration_minutes: goals.minimum_duration_minutes,
            target_viewers: goals.target_viewers,
            base_payout: goals.base_payout,
            partial_payout: goals.partial_payout
          })
        })
      } else {
        // Save individual streamer goals
        response = await fetch('/api/streamer-goals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(goals)
        })
      }

      if (response.ok) {
        if (selectedStreamerId === 'default') {
          alert('System defaults updated successfully! These will apply to all new streamers and as fallbacks.')
        } else {
          alert('Streamer goals updated successfully!')
        }
      } else {
        alert('Error updating goals')
      }
    } catch (error) {
      console.error('Error saving goals:', error)
      alert('Error updating goals')
    }
  }

  const topPerformers = streamers.sort((a, b) => b.avgViewers - a.avgViewers).slice(0, 3)
  const improvingStreamers = streamers.filter(s => s.growthRate > 0).sort((a, b) => b.growthRate - a.growthRate)

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading analytics" />
  }

  return (
    <div className="min-h-screen bg-suspect-body">
      {/* Header */}
      <header className="bg-suspect-header border-b border-suspect-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/admin" className="text-2xl font-bold text-suspect-text">
                SuspectCheats
              </Link>
              <span className="ml-2 text-suspect-gray-400">/ Analytics</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-suspect-text">Analytics & Goals</h1>
            <p className="text-suspect-gray-400 mt-2">
              Performance metrics and streamer analytics
            </p>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex space-x-2">
            {(['day', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                  timeframe === period
                    ? 'bg-suspect-primary text-white'
                    : 'bg-suspect-gray-700 text-suspect-gray-400 hover:bg-suspect-gray-600'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl mr-4">
                📺
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Total Streams</p>
                <p className="text-2xl font-bold text-suspect-text">{metrics?.totalStreams}</p>
                <p className={`text-sm ${(metrics?.growthRates.streams || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(metrics?.growthRates.streams || 0) >= 0 ? '+' : ''}{metrics?.growthRates.streams || 0}% from last {timeframe}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl mr-4">
                ⏱️
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Total Hours</p>
                <p className="text-2xl font-bold text-suspect-text">{metrics?.totalHours}h</p>
                <p className={`text-sm ${(metrics?.growthRates.hours || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(metrics?.growthRates.hours || 0) >= 0 ? '+' : ''}{metrics?.growthRates.hours || 0}% from last {timeframe}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white text-xl mr-4">
                👀
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Total Viewers</p>
                <p className="text-2xl font-bold text-suspect-text">{metrics?.totalViewers.toLocaleString()}</p>
                <p className={`text-sm ${(metrics?.growthRates.viewers || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(metrics?.growthRates.viewers || 0) >= 0 ? '+' : ''}{metrics?.growthRates.viewers || 0}% from last {timeframe}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-xl mr-4">
                📊
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Avg Stream Duration</p>
                <p className="text-2xl font-bold text-suspect-text">{Math.floor((metrics?.avgStreamDuration || 0) / 60)}h {(metrics?.avgStreamDuration || 0) % 60}m</p>
                <p className="text-blue-400 text-sm">Average duration</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-xl mr-4">
                👥
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Active Streamers</p>
                <p className="text-2xl font-bold text-suspect-text">{metrics?.activeStreamers}</p>
                <p className={`text-sm ${(metrics?.growthRates.activeStreamers || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(metrics?.growthRates.activeStreamers || 0) >= 0 ? '+' : ''}{metrics?.growthRates.activeStreamers || 0}% from last {timeframe}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center text-white text-xl mr-4">
                🎯
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Goals Completed</p>
                <p className="text-2xl font-bold text-suspect-text">{metrics?.monthlyGoalCompletions}</p>
                <p className="text-green-400 text-sm">Total completions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performers */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-suspect-text mb-4">Top Performers</h2>
            <div className="space-y-4">
              {topPerformers.map((streamer, index) => (
                <div key={streamer.id} className="flex items-center justify-between p-4 bg-suspect-gray-800 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-yellow-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-suspect-text">{streamer.username}</p>
                      <p className="text-suspect-gray-400 text-sm">{streamer.totalStreams} streams</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-suspect-text font-medium">{streamer.avgViewers.toLocaleString()}</p>
                    <p className="text-suspect-gray-400 text-sm">avg viewers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Leaders */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-suspect-text mb-4">Growth Leaders</h2>
            <div className="space-y-4">
              {improvingStreamers.slice(0, 3).map((streamer, index) => (
                <div key={streamer.id} className="flex items-center justify-between p-4 bg-suspect-gray-800 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                      📈
                    </div>
                    <div>
                      <p className="font-medium text-suspect-text">{streamer.username}</p>
                      <p className="text-suspect-gray-400 text-sm">{streamer.totalHours}h streamed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">+{streamer.growthRate.toFixed(1)}%</p>
                    <p className="text-suspect-gray-400 text-sm">growth</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Streamer Analytics */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-suspect-text mb-4">Detailed Analytics</h2>
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto border border-suspect-gray-700 rounded-lg">
              <table className="w-full">
                <thead className="sticky top-0 bg-suspect-header z-10">
                  <tr className="border-b border-suspect-gray-700">
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Streamer</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Hours</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Avg Viewers</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Streams</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Goal Progress</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Growth</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Last Stream</th>
                  </tr>
                </thead>
                <tbody>
                  {streamers.map((streamer) => (
                    <tr key={streamer.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                      <td className="text-suspect-text py-4 px-4 font-medium">
                        {streamer.username}
                      </td>
                      <td className="text-suspect-text py-4 px-4">
                        {streamer.totalHours}h
                      </td>
                      <td className="text-suspect-text py-4 px-4">
                        {streamer.avgViewers.toLocaleString()}
                      </td>
                      <td className="text-suspect-text py-4 px-4">
                        {streamer.totalStreams}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <div className="w-20 bg-suspect-gray-700 rounded-full h-2 mr-2">
                              <div 
                                className="bg-suspect-primary h-2 rounded-full"
                                style={{ width: `${Math.min(streamer.goalCompletion, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-suspect-text text-sm font-medium">
                              {streamer.goalDetails.fullGoalsMet}/{streamer.goalDetails.total}
                            </span>
                          </div>
                          <div className="text-xs text-suspect-gray-400">
                            {streamer.goalDetails.timeGoalsMet} time • {streamer.goalDetails.viewerGoalsMet} viewers
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-sm font-medium ${
                          streamer.growthRate > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {streamer.growthRate > 0 ? '+' : ''}{streamer.growthRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-suspect-gray-400 py-4 px-4">
                        {new Date(streamer.lastStream).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {streamers.length > 10 && (
              <div className="text-center text-suspect-gray-400 text-sm mt-2">
                Showing {streamers.length} streamers • Scroll to view more
              </div>
            )}
          </div>
        </div>

        {/* Goal Setting Section */}
        <div className="mt-8">
          <div className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-suspect-text">Set Streamer Goals</h2>
                <p className="text-suspect-gray-400 mt-2">
                  Configure individual goal settings for streamers or set system defaults.
                </p>
              </div>
              <button
                onClick={() => setShowGoalsOverview(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <span>📊</span>
                <span>View Goals Overview</span>
              </button>
            </div>
            
            {/* Streamer Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-suspect-text mb-2">
                Select Streamer
              </label>
              <select
                value={selectedStreamerId}
                onChange={(e) => handleStreamerChange(e.target.value)}
                className="input-field w-full"
              >
                <option value="default">System Defaults</option>
                {allStreamers.map((streamer) => (
                  <option key={streamer.id} value={streamer.id}>
                    {streamer.username} ({streamer.tiktok_username})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Minimum Duration (minutes)
                </label>
                <input
                  type="number"
                  value={goals.minimum_duration_minutes}
                  onChange={(e) => setGoals({...goals, minimum_duration_minutes: parseInt(e.target.value)})}
                  className="input-field w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Target Viewers (Total)
                </label>
                <input
                  type="number"
                  value={goals.target_viewers}
                  onChange={(e) => setGoals({...goals, target_viewers: parseInt(e.target.value)})}
                  className="input-field w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Base Payout ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={goals.base_payout}
                  onChange={(e) => setGoals({...goals, base_payout: parseFloat(e.target.value)})}
                  className="input-field w-full"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Partial Payout ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={goals.partial_payout}
                  onChange={(e) => setGoals({...goals, partial_payout: parseFloat(e.target.value)})}
                  className="input-field w-full"
                  min="0"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-suspect-gray-400">
                {selectedStreamerId === 'default' 
                  ? 'Setting system defaults for new streamers'
                  : `Configuring goals for ${allStreamers.find(s => s.id === selectedStreamerId)?.username || 'selected streamer'}`
                }
              </div>
              <button 
                onClick={saveGoals}
                className="btn-primary"
              >
                {selectedStreamerId === 'default' ? 'Save System Defaults' : 'Save Goals'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Overview Modal */}
      {showGoalsOverview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowGoalsOverview(false)}>
              <div className="absolute inset-0 bg-black opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-suspect-body rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-suspect-body px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-suspect-text">Streamer Goals Overview</h3>
                    <p className="text-suspect-gray-400 mt-1">
                      View which streamers have custom goal settings vs system defaults.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGoalsOverview(false)}
                    className="text-suspect-gray-400 hover:text-suspect-text transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <StreamerGoalsTable allStreamers={allStreamers} />
              </div>
              <div className="bg-suspect-body px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-suspect-gray-700">
                <button
                  onClick={() => setShowGoalsOverview(false)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 