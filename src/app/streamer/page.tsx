'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/LoadingSpinner'

interface StreamSession {
  id: string
  start_time: string
  end_time: string
  duration_minutes: number
  peak_viewers: number
  average_viewers: number
  total_viewers: number
  payout_amount: number
  meets_time_goal: boolean
  meets_viewer_goal: boolean
  payout_requested: boolean
  payout_requests: {
    id: string
    status: string
    requested_amount: number
    created_at: string
  }[]
}

interface StreamerGoals {
  minimum_duration_minutes: number
  target_viewers: number
  base_payout: number
  partial_payout: number
}

export default function StreamerDashboard() {
  const { user, streamer, signOut, loading, refreshStreamerData } = useAuth()
  const router = useRouter()
  const [streamSessions, setStreamSessions] = useState<StreamSession[]>([])
  const [goals, setGoals] = useState<StreamerGoals>({
    minimum_duration_minutes: 60,
    target_viewers: 1000,
    base_payout: 7.20,
    partial_payout: 4.50
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [productCategories, setProductCategories] = useState<{id: string, name: string, description: string}[]>([])
  const [assignedKeys, setAssignedKeys] = useState<{
    id: string
    key: string
    assigned_at: string
    expires_at?: string
    hours_left?: number
    minutes_left?: number
    is_expired?: boolean
    product_categories?: {
      id: string
      name: string
      description: string
    }
  }[]>([])
  const [loadingStreams, setLoadingStreams] = useState(true)
  const [loadingKeys, setLoadingKeys] = useState(true)

  useEffect(() => {
    if (!loading && (!user || streamer?.role !== 'streamer')) {
      router.push('/login')
    }
  }, [user, streamer, loading, router])

  useEffect(() => {
    if (streamer?.id) {
      fetchStreamSessions()
      fetchStreamerGoals()
      fetchAssignedKeys()
      
      // Set up auto-refresh for dynamic data
      const keysInterval = setInterval(fetchAssignedKeys, 120000) // Every 2 minutes for new keys
      const goalsInterval = setInterval(fetchStreamerGoals, 300000) // Every 5 minutes for goal changes
      const streamerInterval = setInterval(refreshStreamerData, 30000) // Every 30 seconds for streamer data
      
      return () => {
        clearInterval(keysInterval)
        clearInterval(goalsInterval)
        clearInterval(streamerInterval)
      }
    }
    fetchProductCategories()
  }, [streamer])

  const fetchProductCategories = async () => {
    try {
      const response = await fetch('/api/product-categories')
      if (response.ok) {
        const data = await response.json()
        setProductCategories(data)
      }
    } catch (error) {
      console.error('Error fetching product categories:', error)
    }
  }

  const fetchAssignedKeys = async () => {
    try {
      const response = await fetch(`/api/my-keys?streamer_id=${streamer?.id}`)
      if (response.ok) {
        const keys = await response.json()
        setAssignedKeys(keys)
      }
    } catch (error) {
      console.error('Error fetching assigned keys:', error)
    } finally {
      setLoadingKeys(false)
    }
  }

  const fetchStreamSessions = async () => {
    try {
      const response = await fetch(`/api/my-streams?streamer_id=${streamer?.id}`)
      if (response.ok) {
        const sessions = await response.json()
        setStreamSessions(sessions)
      }
    } catch (error) {
      console.error('Error fetching stream sessions:', error)
    } finally {
      setLoadingStreams(false)
    }
  }

  const fetchStreamerGoals = async () => {
    try {
      const response = await fetch('/api/streamer-goals')
      if (response.ok) {
        const allGoals = await response.json()
        const myGoals = allGoals.find((g: any) => g.streamer_id === streamer?.id)
        if (myGoals) {
          setGoals(myGoals)
        }
      }
    } catch (error) {
      console.error('Error fetching streamer goals:', error)
    }
  }

  const requestPayout = async (sessionId: string) => {
    // Ask for PayPal username
    const paypalUsername = prompt(
      'Please enter your PayPal username/email for payment:\n\n' +
      'This will be used to send your payout directly via PayPal.',
      streamer?.paypal_username || ''
    )
    
    if (!paypalUsername?.trim()) {
      alert('PayPal username is required to request payout')
      return
    }

    try {
      const response = await fetch('/api/payout-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamer_id: streamer?.id,
          stream_session_id: sessionId,
          paypal_username: paypalUsername.trim()
        })
      })

      if (response.ok) {
        alert('Payout request submitted successfully!\nYou will receive payment at: ' + paypalUsername)
        fetchStreamSessions() // Refresh the list
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error submitting payout request')
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const handleKeyRequest = async () => {
    if (!selectedCategoryId.trim()) {
      alert('Please select a category')
      return
    }

    if (!streamer?.id) {
      alert('Unable to identify streamer')
      return
    }

    try {
      const response = await fetch('/api/key-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamer_id: streamer.id,
          category_id: selectedCategoryId.trim()
        })
      })

      if (response.ok) {
        const categoryName = productCategories.find(c => c.id === selectedCategoryId)?.name || 'Unknown'
        alert(`Key request submitted for: ${categoryName}`)
        setSelectedCategoryId('')
        // Refresh keys in case admin approves quickly
        fetchAssignedKeys()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting key request:', error)
      alert('Error submitting key request')
    }
  }

  // Check if streamer has any active keys
  const hasActiveKey = assignedKeys.length > 0
  const activeKey = assignedKeys[0] // Most recent key

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading streamer dashboard" />
  }

  if (!user || streamer?.role !== 'streamer') {
    return null
  }

  // Calculate stats
  const totalEarned = streamSessions.reduce((sum, session) => sum + session.payout_amount, 0)
  const pendingPayouts = streamSessions.filter(s => s.payout_requests.length > 0 && s.payout_requests[0].status === 'pending').length
  const eligibleSessions = streamSessions.filter(s => s.meets_time_goal && !s.payout_requested).length
  const totalHours = Math.round(streamSessions.reduce((sum, session) => sum + session.duration_minutes, 0) / 60 * 10) / 10

  return (
    <div className="min-h-screen bg-suspect-body">
      {/* Header */}
      <header className="bg-suspect-header border-b border-suspect-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center min-w-0 flex-1">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-suspect-text truncate">
                SuspectCheats
              </Link>
              <span className="hidden sm:block ml-2 text-suspect-gray-400">Streamer Panel</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden md:block text-suspect-gray-400 text-sm">Welcome, {streamer?.username || user?.email || 'Streamer'}</span>
              <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1 sm:px-4 sm:py-2">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-suspect-text">Your Dashboard</h1>
          <p className="text-suspect-gray-400 mt-2">
            Track your streaming performance and request payouts
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                ⏱️
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Total Hours</p>
                <p className="text-2xl font-bold text-suspect-text group-hover:text-blue-400 transition-colors duration-300">{totalHours}h</p>
              </div>
            </div>
          </div>

          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 group">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white text-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                📺
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Total Streams</p>
                <p className="text-2xl font-bold text-suspect-text group-hover:text-green-400 transition-colors duration-300">{streamSessions.length}</p>
              </div>
            </div>
          </div>

          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                💰
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Total Earned</p>
                <p className="text-2xl font-bold text-suspect-text group-hover:text-yellow-400 transition-colors duration-300">${totalEarned.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 group">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                🎯
              </div>
              <div>
                <p className="text-suspect-gray-400 text-sm">Eligible Payouts</p>
                <p className="text-2xl font-bold text-suspect-text group-hover:text-purple-400 transition-colors duration-300">{eligibleSessions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Current Goals */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-suspect-text mb-4">Stream Goals</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-suspect-dark rounded-lg">
                <span className="text-suspect-text">Minimum Duration</span>
                <span className="text-suspect-primary font-semibold">{goals.minimum_duration_minutes} minutes</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-suspect-dark rounded-lg">
                <span className="text-suspect-text">Target Viewers (Total)</span>
                <span className="text-suspect-primary font-semibold">{goals.target_viewers.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-suspect-dark rounded-lg">
                <span className="text-suspect-text">Full Goal Payout</span>
                <span className="text-green-400 font-semibold">${goals.base_payout.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-suspect-dark rounded-lg">
                <span className="text-suspect-text">Time Only Payout</span>
                <span className="text-yellow-400 font-semibold">${goals.partial_payout.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                              <p className="text-blue-300 text-sm">
                 💡 <strong>How it works:</strong> Stream for {goals.minimum_duration_minutes} minutes to earn ${goals.partial_payout.toFixed(2)}. 
                 Get {goals.target_viewers.toLocaleString()} total viewers during your stream to earn ${goals.base_payout.toFixed(2)}. 
                 Stream longer to earn proportionally more!
                </p>
            </div>
          </div>

          {/* Product Keys */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-suspect-text mb-4">
              Product Keys
              {hasActiveKey && (
                <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  ⏰ {activeKey.hours_left}h {activeKey.minutes_left}m left
                </span>
              )}
            </h2>
            
            {/* Current Keys */}
            <div className="mb-6">
              <p className="text-suspect-gray-400 text-sm mb-2">Your Assigned Keys:</p>
              {loadingKeys ? (
                <div className="bg-suspect-dark p-3 rounded-lg border">
                  <p className="text-suspect-gray-400 text-sm">Loading your keys</p>
                </div>
              ) : assignedKeys.length === 0 ? (
                <div className="bg-suspect-dark p-3 rounded-lg border">
                  <p className="text-suspect-gray-400 text-sm">No active keys. Request a key below!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedKeys.map((keyData) => (
                    <div key={keyData.id} className="bg-suspect-dark p-3 rounded-lg border border-green-500/30">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-suspect-primary font-mono text-lg">{keyData.key}</code>
                            <span className="text-suspect-gray-400 text-xs">
                              {keyData.product_categories?.name || 'Unknown Category'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-suspect-gray-400">
                              Assigned: {new Date(keyData.assigned_at).toLocaleDateString()} at {new Date(keyData.assigned_at).toLocaleTimeString()}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-red-400 font-medium">
                                ⏰ Expires in {keyData.hours_left}h {keyData.minutes_left}m
                              </span>
                              <div className="w-16 bg-red-900/50 rounded-full h-2">
                                <div 
                                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.max(5, ((keyData.hours_left || 0) * 60 + (keyData.minutes_left || 0)) / (24 * 60) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Request New Key */}
            <div>
              <p className="text-suspect-gray-400 text-sm mb-2">Request New Product Key:</p>
              
              {hasActiveKey ? (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-400">⚠️</span>
                    <span className="text-yellow-400 font-medium">Active Key Found</span>
                  </div>
                  <p className="text-yellow-300 text-sm">
                    You currently have an active key that expires in {activeKey.hours_left}h {activeKey.minutes_left}m. 
                    You can request a new key after your current one expires.
                  </p>
                  <p className="text-yellow-400 text-xs mt-2">
                    ⏰ Current key expires: {activeKey.expires_at ? new Date(activeKey.expires_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex space-x-2">
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="flex-1 input-field"
                    >
                      <option value="">Select a category...</option>
                      {productCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleKeyRequest}
                      className="btn-primary"
                      disabled={!selectedCategoryId.trim()}
                    >
                      Request
                    </button>
                  </div>
                  <p className="text-suspect-gray-400 text-xs mt-2">
                    🔑 Keys are valid for 24 hours after assignment. Requests are reviewed by admins and typically processed within 24 hours.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stream Sessions & Payouts */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-suspect-text">Recent Streams & Payouts</h2>
            {pendingPayouts > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg px-3 py-1">
                <span className="text-yellow-400 text-sm">{pendingPayouts} pending payout{pendingPayouts !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          {loadingStreams ? (
            <div className="text-center text-suspect-gray-400 py-8">Loading streams</div>
          ) : streamSessions.length === 0 ? (
            <div className="text-center text-suspect-gray-400 py-8">
              No streams found. Start streaming to see your sessions here!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto border border-suspect-gray-700 rounded-lg">
                <table className="w-full">
                  <thead className="sticky top-0 bg-suspect-header z-10">
                    <tr className="border-b border-suspect-gray-700">
                      <th className="text-left text-suspect-gray-400 py-3 px-4">Date</th>
                      <th className="text-left text-suspect-gray-400 py-3 px-4">Duration</th>
                      <th className="text-left text-suspect-gray-400 py-3 px-4">Total Viewers</th>
                      <th className="text-left text-suspect-gray-400 py-3 px-4">Goals</th>
                      <th className="text-left text-suspect-gray-400 py-3 px-4">Payout</th>
                      <th className="text-left text-suspect-gray-400 py-3 px-4">Status</th>
                      <th className="text-left text-suspect-gray-400 py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {streamSessions.map((session) => (
                      <tr key={session.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                        <td className="text-suspect-text py-4 px-4">
                          {new Date(session.start_time).toLocaleDateString()}
                        </td>
                        <td className="text-suspect-text py-4 px-4">
                          {Math.floor(session.duration_minutes / 60)}h {session.duration_minutes % 60}m
                        </td>
                        <td className="text-suspect-text py-4 px-4">
                         {session.total_viewers?.toLocaleString() || '0'}
                       </td>
                        <td className="py-4 px-4">
                          <div className="flex space-x-1">
                            <span className={`px-2 py-1 rounded text-xs ${
                              session.meets_time_goal ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                            }`}>
                              {session.meets_time_goal ? '⏱️' : '❌'} Time
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              session.meets_viewer_goal ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                            }`}>
                              {session.meets_viewer_goal ? '👀' : '❌'} Views
                            </span>
                          </div>
                        </td>
                        <td className="text-suspect-text py-4 px-4 font-semibold">
                          ${session.payout_amount.toFixed(2)}
                        </td>
                        <td className="py-4 px-4">
                          {session.payout_requests.length > 0 ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.payout_requests[0].status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : session.payout_requests[0].status === 'denied'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {session.payout_requests[0].status}
                            </span>
                          ) : session.meets_time_goal ? (
                            <span className="text-green-400 text-sm">Eligible</span>
                          ) : (
                            <span className="text-red-400 text-sm">Not eligible</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {session.meets_time_goal && session.payout_requests.length === 0 ? (
                            <button
                              onClick={() => requestPayout(session.id)}
                              className="bg-suspect-primary hover:bg-suspect-primary/80 text-white px-3 py-1 rounded text-sm"
                            >
                              Request Payout
                            </button>
                          ) : (
                            <span className="text-suspect-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {streamSessions.length > 6 && (
                <div className="text-center text-suspect-gray-400 text-sm mt-2">
                  Showing {streamSessions.length} streams • Scroll to view more
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 