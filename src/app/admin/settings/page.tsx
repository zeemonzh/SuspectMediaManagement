'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface InvitationKey {
  id: string
  code: string
  created_by: string
  created_at: string
  used_at?: string
  used_by?: string
  is_active: boolean
}

interface SecuritySettings {
  session_timeout_minutes: number
  min_password_length: number
  require_2fa: boolean
  max_login_attempts: number
  account_lockout_duration_minutes: number
}

interface ActivityLog {
  id: string
  type: string
  message: string
  timestamp: string
  user: string
  category: 'user' | 'payout' | 'key' | 'system'
  status?: string
  details?: any
}

export default function AdminSettings() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'invitations' | 'users' | 'system' | 'logs'>('invitations')
  const [invitationKeys, setInvitationKeys] = useState<InvitationKey[]>([])
  const [streamers, setStreamers] = useState<any[]>([])
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    session_timeout_minutes: 480,
    min_password_length: 8,
    require_2fa: false,
    max_login_attempts: 5,
    account_lockout_duration_minutes: 30
  })
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityCategory, setActivityCategory] = useState<'all' | 'user' | 'payout' | 'key' | 'system'>('all')
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityOffset, setActivityOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false)
  const [newKeyCount, setNewKeyCount] = useState(1)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/login')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin, activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'invitations') {
        await fetchInvitationKeys()
      } else if (activeTab === 'users') {
        await fetchStreamers()
      } else if (activeTab === 'system') {
        await fetchSecuritySettings()
      } else if (activeTab === 'logs') {
        await fetchActivityLogs()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitationKeys = async () => {
    try {
      const response = await fetch('/api/admin/invitation-keys')
      if (response.ok) {
        const data = await response.json()
        setInvitationKeys(data)
      }
    } catch (error) {
      console.error('Error fetching invitation keys:', error)
    }
  }

  const fetchStreamers = async () => {
    try {
      const response = await fetch('/api/streamers')
      if (response.ok) {
        const data = await response.json()
        setStreamers(data)
      }
    } catch (error) {
      console.error('Error fetching streamers:', error)
    }
  }

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch('/api/admin/security-settings')
      if (response.ok) {
        const data = await response.json()
        setSecuritySettings(data)
      }
    } catch (error) {
      console.error('Error fetching security settings:', error)
    }
  }

  const fetchActivityLogs = async (reset = true) => {
    try {
      setActivityLoading(true)
      const offset = reset ? 0 : activityOffset
      const response = await fetch(`/api/admin/activity-logs?category=${activityCategory}&limit=25&offset=${offset}`)
      if (response.ok) {
        const data = await response.json()
        if (reset) {
          setActivityLogs(data.activities)
          setActivityOffset(0)
        } else {
          setActivityLogs(prev => [...prev, ...data.activities])
        }
        setActivityTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  const generateInvitationKeys = async () => {
    try {
      const response = await fetch('/api/admin/invitation-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: newKeyCount })
      })

      if (response.ok) {
        setShowCreateKeyModal(false)
        setNewKeyCount(1)
        await fetchInvitationKeys()
        alert(`${newKeyCount} invitation key(s) generated successfully!`)
      } else {
        alert('Error generating invitation keys')
      }
    } catch (error) {
      console.error('Error generating keys:', error)
      alert('Error generating invitation keys')
    }
  }

  const deleteKey = async (keyId: string, keyCode: string, usedBy?: string) => {
    const confirmMessage = usedBy 
      ? `Are you sure you want to delete invitation key "${keyCode}"?\n\nThis will also DELETE the admin account that used this key: ${usedBy}\n\nThis action cannot be undone!`
      : `Are you sure you want to delete invitation key "${keyCode}"?\n\nThis action cannot be undone!`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/invitation-keys/${keyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        await fetchInvitationKeys()
        alert(result.message || 'Invitation key deleted successfully!')
      } else {
        alert('Error deleting invitation key')
      }
    } catch (error) {
      console.error('Error deleting key:', error)
      alert('Error deleting invitation key')
    }
  }

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete the user "${username}"? This action cannot be undone and will permanently remove all their data including stream sessions, payouts, and account information.`)) {
      return
    }

    try {
      const response = await fetch(`/api/streamers/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchStreamers() // Refresh the list
        alert(`User "${username}" has been deleted successfully.`)
      } else {
        alert('Error deleting user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user')
    }
  }

  const saveSecuritySettings = async () => {
    try {
      const response = await fetch('/api/admin/security-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(securitySettings)
      })

      if (response.ok) {
        alert('Security settings saved successfully!')
      } else {
        const error = await response.json()
        alert(`Error saving settings: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving security settings:', error)
      alert('Error saving security settings')
    }
  }

  const loadMoreActivities = async () => {
    setActivityOffset(prev => prev + 25)
    await fetchActivityLogs(false)
  }

  const handleCategoryChange = async (newCategory: typeof activityCategory) => {
    setActivityCategory(newCategory)
    setActivityOffset(0)
    // Fetch will be triggered by useEffect
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

  const getStatusColor = (category: string, status?: string) => {
    switch (category) {
      case 'user':
        return status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      case 'payout':
        switch (status) {
          case 'pending': return 'bg-yellow-500/20 text-yellow-400'
          case 'approved': return 'bg-blue-500/20 text-blue-400'
          case 'paid': return 'bg-green-500/20 text-green-400'
          case 'denied': return 'bg-red-500/20 text-red-400'
          default: return 'bg-gray-500/20 text-gray-400'
        }
      case 'key':
        switch (status) {
          case 'pending': return 'bg-yellow-500/20 text-yellow-400'
          case 'approved': return 'bg-green-500/20 text-green-400'
          case 'denied': return 'bg-red-500/20 text-red-400'
          default: return 'bg-gray-500/20 text-gray-400'
        }
      case 'system':
        return 'bg-purple-500/20 text-purple-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user': return '👤'
      case 'payout': return '💰'
      case 'key': return '🔑'
      case 'system': return '⚙️'
      default: return '📋'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  // Effect to refetch activity logs when category changes
  useEffect(() => {
    if (isAdmin && activeTab === 'logs') {
      fetchActivityLogs()
    }
  }, [activityCategory])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-suspect-body flex items-center justify-center">
        <div className="text-suspect-text">Loading settings...</div>
      </div>
    )
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
            <div className="flex items-center">
              <Link href="/admin" className="text-2xl font-bold text-suspect-text">
                SuspectCheats
              </Link>
              <span className="ml-2 text-suspect-gray-400">/ Settings</span>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-suspect-text">Admin Settings</h1>
          <p className="text-suspect-gray-400 mt-2">
            Manage platform settings, user access, and system configuration
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-suspect-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'invitations', name: 'Invitation Keys', icon: '🔑' },
              { id: 'users', name: 'User Management', icon: '👥' },
              { id: 'system', name: 'Security Settings', icon: '🔒' },
              { id: 'logs', name: 'Activity Logs', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-suspect-primary text-suspect-primary'
                    : 'border-transparent text-suspect-gray-400 hover:text-suspect-text hover:border-suspect-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Invitation Keys Tab */}
        {activeTab === 'invitations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-suspect-text">Invitation Keys</h2>
                <p className="text-suspect-gray-400 mt-1">
                  Generate and manage invitation keys for new registrations. Deleting a used key will also delete the associated admin account.
                </p>
              </div>
              <button
                onClick={() => setShowCreateKeyModal(true)}
                className="btn-primary"
              >
                Generate Keys
              </button>
            </div>

            <div className="card p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-suspect-gray-700">
                      <th className="text-left text-suspect-gray-400 py-3">Invitation Code</th>
                      <th className="text-left text-suspect-gray-400 py-3">Status</th>
                      <th className="text-left text-suspect-gray-400 py-3">Created</th>
                      <th className="text-left text-suspect-gray-400 py-3">Used By</th>
                      <th className="text-left text-suspect-gray-400 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitationKeys.map((key) => (
                      <tr key={key.id} className="border-b border-suspect-gray-800">
                        <td className="text-suspect-text py-4 font-mono">
                          <div className="flex items-center space-x-2">
                            <span>{key.code}</span>
                            <button
                              onClick={() => copyToClipboard(key.code)}
                              className="text-suspect-gray-400 hover:text-suspect-text"
                              title="Copy to clipboard"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            key.used_at 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {key.used_at ? 'Used' : 'Active'}
                          </span>
                        </td>
                        <td className="text-suspect-gray-400 py-4">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-suspect-text py-4">
                          {key.used_by || '-'}
                        </td>
                        <td className="py-4">
                          {!key.used_at && (
                            <button
                              onClick={() => deleteKey(key.id, key.code, key.used_by)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invitationKeys.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-suspect-gray-400 py-8">
                          No invitation keys found. Generate some to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-suspect-text">User Management</h2>
              <p className="text-suspect-gray-400 mt-1">
                Manage user accounts, delete users, and view user activity
              </p>
            </div>

            <div className="card p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-suspect-gray-700">
                      <th className="text-left text-suspect-gray-400 py-3">Username</th>
                      <th className="text-left text-suspect-gray-400 py-3">Email</th>
                      <th className="text-left text-suspect-gray-400 py-3">TikTok</th>
                      <th className="text-left text-suspect-gray-400 py-3">Status</th>
                      <th className="text-left text-suspect-gray-400 py-3">Joined</th>
                      <th className="text-left text-suspect-gray-400 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {streamers.map((streamer) => (
                      <tr key={streamer.id} className="border-b border-suspect-gray-800">
                        <td className="text-suspect-text py-4 font-medium">
                          {streamer.username}
                        </td>
                        <td className="text-suspect-gray-400 py-4">
                          {streamer.email}
                        </td>
                        <td className="text-suspect-text py-4">
                          {streamer.tiktok_username}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            streamer.is_active 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {streamer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-suspect-gray-400 py-4">
                          {new Date(streamer.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => deleteUser(streamer.id, streamer.username)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-suspect-text">Security Settings</h2>
              <p className="text-suspect-gray-400 mt-1">
                Configure security and authentication settings for the platform
              </p>
            </div>

            <div className="card p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="1440"
                      value={securitySettings.session_timeout_minutes}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        session_timeout_minutes: parseInt(e.target.value) || 480
                      }))}
                      className="input-field w-full"
                      placeholder="Session timeout in minutes"
                    />
                    <p className="text-xs text-suspect-gray-400 mt-1">
                      How long users stay logged in (30-1440 minutes)
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="50"
                      value={securitySettings.min_password_length}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        min_password_length: parseInt(e.target.value) || 8
                      }))}
                      className="input-field w-full"
                      placeholder="Minimum password length"
                    />
                    <p className="text-xs text-suspect-gray-400 mt-1">
                      Required minimum characters for passwords (6-50)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Maximum Login Attempts
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={securitySettings.max_login_attempts}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        max_login_attempts: parseInt(e.target.value) || 5
                      }))}
                      className="input-field w-full"
                      placeholder="Max login attempts before lockout"
                    />
                    <p className="text-xs text-suspect-gray-400 mt-1">
                      Failed attempts before account lockout (3-20)
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Account Lockout Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={securitySettings.account_lockout_duration_minutes}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        account_lockout_duration_minutes: parseInt(e.target.value) || 30
                      }))}
                      className="input-field w-full"
                      placeholder="Lockout duration in minutes"
                    />
                    <p className="text-xs text-suspect-gray-400 mt-1">
                      How long accounts stay locked (5-1440 minutes)
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="require-2fa"
                      checked={securitySettings.require_2fa}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        require_2fa: e.target.checked
                      }))}
                      className="rounded border-suspect-gray-600 text-suspect-primary focus:ring-suspect-primary"
                    />
                    <label htmlFor="require-2fa" className="ml-2 text-sm text-suspect-text">
                      Require two-factor authentication
                    </label>
                  </div>
                  <p className="text-xs text-suspect-gray-400 ml-6">
                    Force all users to enable 2FA for enhanced security
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-suspect-gray-700">
                <button 
                  onClick={saveSecuritySettings}
                  className="btn-primary"
                >
                  Save Security Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activity Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-suspect-text">Activity Logs</h2>
                <p className="text-suspect-gray-400 mt-1">
                  View comprehensive system activity and audit logs
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={activityCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as typeof activityCategory)}
                  className="input-field"
                >
                  <option value="all">All Activities</option>
                  <option value="user">👤 User Activities</option>
                  <option value="payout">💰 Payout Activities</option>
                  <option value="key">🔑 Key Activities</option>
                  <option value="system">⚙️ System Activities</option>
                </select>
              </div>
            </div>

            <div className="card p-6">
              {activityLoading && activityLogs.length === 0 ? (
                <div className="text-center text-suspect-gray-400 py-8">Loading activity logs...</div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center text-suspect-gray-400 py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-suspect-text mb-2">No Activities Found</h3>
                  <p>No activities found for the selected category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-4 border-b border-suspect-gray-700 last:border-b-0">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{getCategoryIcon(activity.category)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-suspect-text font-medium">{activity.message}</span>
                            {activity.status && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.category, activity.status)}`}>
                                {activity.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-suspect-gray-400 text-sm">by {activity.user}</span>
                            <span className="text-suspect-gray-400 text-sm">{formatTimestamp(activity.timestamp)}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              activity.category === 'user' ? 'bg-blue-500/20 text-blue-400' :
                              activity.category === 'payout' ? 'bg-green-500/20 text-green-400' :
                              activity.category === 'key' ? 'bg-yellow-500/20 text-yellow-400' :
                              activity.category === 'system' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {activity.category}
                            </span>
                          </div>
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <div className="mt-2">
                              <details className="text-xs">
                                <summary className="text-suspect-gray-400 cursor-pointer hover:text-suspect-text">View Details</summary>
                                <div className="mt-2 p-3 bg-suspect-gray-800 rounded-lg">
                                  <pre className="text-suspect-gray-300 whitespace-pre-wrap">
                                    {JSON.stringify(activity.details, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {activityLogs.length < activityTotal && (
                    <div className="text-center pt-4">
                      <button
                        onClick={loadMoreActivities}
                        disabled={activityLoading}
                        className="btn-secondary"
                      >
                        {activityLoading ? 'Loading...' : `Load More (${activityLogs.length}/${activityTotal})`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Invitation Keys Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowCreateKeyModal(false)}>
              <div className="absolute inset-0 bg-black opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-suspect-body rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-suspect-body px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-suspect-text">Generate Invitation Keys</h3>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-suspect-text mb-2">
                        Number of keys to generate
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={newKeyCount}
                        onChange={(e) => setNewKeyCount(parseInt(e.target.value) || 1)}
                        className="input-field w-full"
                      />
                      <p className="text-xs text-suspect-gray-400 mt-1">
                        Each key can be used once for registration
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-suspect-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={generateInvitationKeys}
                  className="btn-primary w-full sm:w-auto sm:ml-3"
                >
                  Generate Keys
                </button>
                <button
                  onClick={() => setShowCreateKeyModal(false)}
                  className="btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 