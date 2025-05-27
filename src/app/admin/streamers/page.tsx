'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Streamer {
  id: string
  username: string
  tiktok_username: string
  email: string
  is_active: boolean
  created_at: string
  total_hours: number
  avg_viewers: number
  total_payout: number
}

export default function AdminStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch streamers from database
  useEffect(() => {
    fetchStreamers()
  }, [])

  const fetchStreamers = async () => {
    try {
      console.log('Fetching streamers from /api/streamers...')
      const response = await fetch('/api/streamers')
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Received streamers:', data)
        setStreamers(data)
      } else {
        const errorText = await response.text()
        console.error('Error fetching streamers:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error fetching streamers:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStreamerStatus = async (id: string) => {
    try {
      const streamer = streamers.find(s => s.id === id)
      if (!streamer) return

      const response = await fetch(`/api/streamers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !streamer.is_active
        }),
      })

      if (response.ok) {
        fetchStreamers() // Refresh the list
      } else {
        alert('Error updating streamer status')
      }
    } catch (error) {
      console.error('Error toggling streamer status:', error)
      alert('Error updating streamer status')
    }
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
              <span className="ml-2 text-suspect-gray-400">/ Manage Streamers</span>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-suspect-text">Manage Streamers</h1>
            <p className="text-suspect-gray-400 mt-2">
              View streamer accounts and manage their status. For user deletion, visit Admin Settings.
            </p>
          </div>
        </div>

        {/* Streamers Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-suspect-text">{streamers.length}</p>
              <p className="text-suspect-gray-400 text-sm">Total Streamers</p>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{streamers.filter(s => s.is_active).length}</p>
              <p className="text-suspect-gray-400 text-sm">Active Streamers</p>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{streamers.reduce((sum, s) => sum + s.total_hours, 0)}h</p>
              <p className="text-suspect-gray-400 text-sm">Total Hours</p>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-suspect-primary">${streamers.reduce((sum, s) => sum + s.total_payout, 0)}</p>
              <p className="text-suspect-gray-400 text-sm">Total Payouts</p>
            </div>
          </div>
        </div>

        {/* Streamers Table */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-suspect-text">All Streamers</h2>
            {loading && (
              <div className="text-suspect-gray-400">Loading...</div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-suspect-gray-700">
                  <th className="text-left text-suspect-gray-400 py-3">Username</th>
                  <th className="text-left text-suspect-gray-400 py-3">TikTok</th>
                  <th className="text-left text-suspect-gray-400 py-3">Email</th>
                  <th className="text-left text-suspect-gray-400 py-3">Joined</th>
                  <th className="text-left text-suspect-gray-400 py-3">Hours</th>
                  <th className="text-left text-suspect-gray-400 py-3">Avg Viewers</th>
                  <th className="text-left text-suspect-gray-400 py-3">Total Payout</th>
                  <th className="text-left text-suspect-gray-400 py-3">Status</th>
                  <th className="text-left text-suspect-gray-400 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {streamers.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} className="text-center text-suspect-gray-400 py-8">
                      No streamers found. They will appear here after registering.
                    </td>
                  </tr>
                ) : (
                  streamers.map((streamer) => (
                    <tr key={streamer.id} className="border-b border-suspect-gray-800">
                      <td className="text-suspect-text py-4 font-medium">
                        {streamer.username}
                      </td>
                      <td className="text-suspect-text py-4">
                        {streamer.tiktok_username}
                      </td>
                      <td className="text-suspect-gray-400 py-4">
                        {streamer.email}
                      </td>
                      <td className="text-suspect-gray-400 py-4">
                        {new Date(streamer.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-suspect-text py-4">
                        {streamer.total_hours}h
                      </td>
                      <td className="text-suspect-text py-4">
                        {streamer.avg_viewers.toLocaleString()}
                      </td>
                      <td className="text-suspect-text py-4">
                        ${streamer.total_payout}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          streamer.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {streamer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleStreamerStatus(streamer.id)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              streamer.is_active
                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                : 'bg-green-600 hover:bg-green-700'
                            } text-white`}
                          >
                            {streamer.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 