'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner, { LoadingDots } from '@/components/LoadingSpinner'
import AlertDialog from '@/components/AlertDialog'
import ConfirmDialog from '@/components/ConfirmDialog'

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
  discord_webhook_url?: string
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
  const [adminInvitationKeys, setAdminInvitationKeys] = useState<InvitationKey[]>([])
  const [streamerInvitationKeys, setStreamerInvitationKeys] = useState<InvitationKey[]>([])
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
  const [keyType, setKeyType] = useState<'admin' | 'streamer'>('streamer')

  // Simple cache to avoid refetching data when switching tabs
  const [dataCache, setDataCache] = useState<{
    invitations?: boolean
    users?: boolean
    system?: boolean
    logs?: boolean
  }>({})

  // Add state for delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    userId: string
    username: string
  }>({
    isOpen: false,
    userId: '',
    username: ''
  })

  // Add state for alerts
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  // Add state for key deletion dialog
  const [deleteKeyDialog, setDeleteKeyDialog] = useState<{
    isOpen: boolean
    keyId: string
    keyCode: string
    usedBy?: string
  }>({
    isOpen: false,
    keyId: '',
    keyCode: '',
    usedBy: undefined
  })

  // Add state for clipboard alert
  const [clipboardAlert, setClipboardAlert] = useState<{
    isOpen: boolean
    text: string
  }>({
    isOpen: false,
    text: ''
  })

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

  // Initial data load for the default tab
  useEffect(() => {
    if (isAdmin) {
      fetchInitialData()
    }
  }, [isAdmin])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      // Load data for the default active tab (invitations)
      await fetchInvitationKeys()
      setDataCache(prev => ({ ...prev, invitations: true }))
    } catch (error) {
      console.error('Error fetching initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    // Activity logs should always be fresh since they change frequently
    // Other tabs can use cache safely if data has been loaded
    if (dataCache[activeTab] && activeTab !== 'logs') {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Only fetch data for the active tab to improve performance
      switch (activeTab) {
        case 'invitations':
          await fetchInvitationKeys()
          setDataCache(prev => ({ ...prev, invitations: true }))
          break
        case 'users':
          await fetchStreamers()
          setDataCache(prev => ({ ...prev, users: true }))
          break
        case 'system':
          await fetchSecuritySettings()
          setDataCache(prev => ({ ...prev, system: true }))
          break
        case 'logs':
          await fetchActivityLogs()
          // Don't cache logs - always fresh
          break
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitationKeys = async () => {
    try {
      // Fetch admin invitation keys
      const adminResponse = await fetch('/api/admin/invitation-keys')
      if (adminResponse.ok) {
        const adminKeys = await adminResponse.json()
        setAdminInvitationKeys(adminKeys)
      }

      // Fetch streamer invitation keys
      const streamerResponse = await fetch('/api/admin/streamer-invitation-keys')
      if (streamerResponse.ok) {
        const streamerKeys = await streamerResponse.json()
        setStreamerInvitationKeys(streamerKeys)
      }
    } catch (error) {
      console.error('Error fetching invitation keys:', error)
      showAlert('Error', 'Failed to fetch invitation keys', 'error')
    }
  }

  const fetchStreamers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setStreamers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showAlert('Success', 'Copied to clipboard!', 'success')
  }

  const generateInvitationKeys = async () => {
    try {
      const response = await fetch(`/api/admin/${keyType}-invitation-keys`, {
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
        // Invalidate cache for invitations tab
        setDataCache(prev => ({ ...prev, invitations: false }))
        showAlert('Success', `${newKeyCount} ${keyType} invitation key(s) generated successfully!`, 'success')
      } else {
        showAlert('Error', `Error generating ${keyType} invitation keys`, 'error')
      }
    } catch (error) {
      console.error('Error generating keys:', error)
      showAlert('Error', `Error generating ${keyType} invitation keys`, 'error')
    }
  }

  const deleteKey = async (keyId: string, keyCode: string, type: 'admin' | 'streamer', usedBy: string | null) => {
    try {
      const response = await fetch(`/api/admin/${type}-invitation-keys/${keyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        await fetchInvitationKeys()
        // Invalidate cache
        setDataCache(prev => ({ ...prev, invitations: false, users: false }))
        showAlert('Success', result.message || `${type} invitation key deleted successfully!`, 'success')
      } else {
        showAlert('Error', `Error deleting ${type} invitation key`, 'error')
      }
    } catch (error) {
      console.error('Error deleting key:', error)
      showAlert('Error', `Error deleting ${type} invitation key`, 'error')
    }
  }

  const deleteUser = async (userId: string, username: string) => {
    try {
      const response = await fetch(`/api/streamers/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchStreamers() // Refresh the list
        // Invalidate cache
        setDataCache(prev => ({ ...prev, users: false, logs: false }))
        showAlert('Success', `User "${username}" has been deleted successfully.`, 'success')
      } else {
        showAlert('Error', 'Error deleting user', 'error')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showAlert('Error', 'Error deleting user', 'error')
    }
  }

  const saveSecuritySettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/security-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(securitySettings)
      })

      if (response.ok) {
        showAlert('Success', 'Security settings updated successfully', 'success')
      } else {
        showAlert('Error', 'Failed to update security settings', 'error')
      }
    } catch (error) {
      console.error('Error saving security settings:', error)
      showAlert('Error', 'Failed to update security settings', 'error')
    }
    setLoading(false)
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

  // Effect to refetch activity logs when category changes
  useEffect(() => {
    if (isAdmin && activeTab === 'logs') {
      fetchActivityLogs()
    }
  }, [activityCategory])

  // Add showAlert function
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertDialog({ isOpen: true, title, message, type })
  }

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen text="Loading settings" />
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
              <span className="hidden sm:block ml-2 text-suspect-gray-400">/ Settings</span>
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
          <h1 className="text-3xl font-bold text-suspect-text">Admin Settings</h1>
          <p className="text-suspect-gray-400 mt-2">
            Manage platform settings, user access, and system configuration
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-suspect-gray-700 mb-8">
          <nav className="-mb-px grid grid-cols-2 md:flex md:space-x-8 gap-2 md:gap-0">
            {[
              { id: 'invitations', name: 'Invitation Keys', icon: '🔑', shortName: 'Keys' },
              { id: 'users', name: 'User Management', icon: '👥', shortName: 'Users' },
              { id: 'system', name: 'Security Settings', icon: '🔒', shortName: 'Security' },
              { id: 'logs', name: 'Activity Logs', icon: '📋', shortName: 'Logs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center justify-center md:justify-start space-x-1 md:space-x-2 ${
                  activeTab === tab.id
                    ? 'border-suspect-primary text-suspect-primary'
                    : 'border-transparent text-suspect-gray-400 hover:text-suspect-text hover:border-suspect-gray-300'
                }`}
              >
                <span className="text-sm md:text-base">{tab.icon}</span>
                <span className="md:hidden">{tab.shortName}</span>
                <span className="hidden md:inline">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Invitation Keys Tab */}
        {activeTab === 'invitations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-suspect-text">Invitation Keys</h2>
                <p className="text-suspect-gray-400 mt-1">
                  Generate and manage invitation keys for new registrations. Deleting a used key will also delete the associated account.
                </p>
              </div>
              <button
                onClick={() => setShowCreateKeyModal(true)}
                className="btn-primary w-full sm:w-auto"
              >
                Generate Keys
              </button>
            </div>

            {/* Admin Keys Section */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-suspect-text mb-4">Admin Invitation Keys</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-suspect-gray-400 font-medium">Key</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Created</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Status</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Used By</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminInvitationKeys.map((key) => (
                      <tr key={key.id} className="border-t border-suspect-gray-800">
                        <td className="py-3">{key.code}</td>
                        <td className="py-3">{new Date(key.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${key.is_active ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                            {key.is_active ? 'Active' : 'Used'}
                          </span>
                        </td>
                        <td className="py-3">{key.used_by || '-'}</td>
                        <td className="py-3">
                          <button
                            onClick={() => deleteKey(key.id, key.code, 'admin', key.used_by || null)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Streamer Keys Section */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-suspect-text mb-4">Streamer Invitation Keys</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-suspect-gray-400 font-medium">Key</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Created</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Status</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Used By</th>
                      <th className="text-left text-suspect-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {streamerInvitationKeys.map((key) => (
                      <tr key={key.id} className="border-t border-suspect-gray-800">
                        <td className="py-3">{key.code}</td>
                        <td className="py-3">{new Date(key.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${key.is_active ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                            {key.is_active ? 'Active' : 'Used'}
                          </span>
                        </td>
                        <td className="py-3">{key.used_by || '-'}</td>
                        <td className="py-3">
                          <button
                            onClick={() => deleteKey(key.id, key.code, 'streamer', key.used_by || null)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
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
                <div className="max-h-96 overflow-y-auto border border-suspect-gray-700 rounded-lg">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-suspect-header z-10">
                      <tr className="border-b border-suspect-gray-700">
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Username</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Role</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Email</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">TikTok</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Status</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Joined</th>
                        <th className="text-left text-suspect-gray-400 py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streamers.map((streamer) => (
                        <tr key={streamer.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                          <td className="text-suspect-text py-4 px-4 font-medium">
                            {streamer.username}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              streamer.role === 'admin' 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {streamer.role === 'admin' ? 'Admin' : 'Streamer'}
                            </span>
                          </td>
                          <td className="text-suspect-gray-400 py-4 px-4">
                            {streamer.email}
                          </td>
                          <td className="text-suspect-text py-4 px-4">
                            {streamer.tiktok_username === 'N/A' ? '-' : streamer.tiktok_username}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              streamer.is_active 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {streamer.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-suspect-gray-400 py-4 px-4">
                            {new Date(streamer.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setDeleteDialog({
                                  isOpen: true,
                                  userId: streamer.id,
                                  username: streamer.username
                                })}
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
                {streamers.length > 6 && (
                  <div className="text-center text-suspect-gray-400 text-sm mt-2">
                    Showing {streamers.length} users • Scroll to view more
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-suspect-text">System Settings</h2>
              <p className="text-suspect-gray-400 mt-1">
                Configure system-wide security and notification settings
              </p>
            </div>

            <div className="card p-6 space-y-6">
              {/* Session Settings */}
              <div>
                <h3 className="text-lg font-medium text-suspect-text mb-4">Session Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={securitySettings.session_timeout_minutes}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        session_timeout_minutes: parseInt(e.target.value) || 480
                      }))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-suspect-gray-400 mt-1">
                      Users will be logged out after this period of inactivity
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Settings */}
              <div>
                <h3 className="text-lg font-medium text-suspect-text mb-4">Password Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="32"
                      value={securitySettings.min_password_length}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        min_password_length: parseInt(e.target.value) || 8
                      }))}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Login Security */}
              <div>
                <h3 className="text-lg font-medium text-suspect-text mb-4">Login Security</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Maximum Login Attempts
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={securitySettings.max_login_attempts}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        max_login_attempts: parseInt(e.target.value) || 5
                      }))}
                      className="input-field w-full"
                    />
                  </div>

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
                    />
                  </div>
                </div>
              </div>

              {/* Discord Webhook Settings */}
              <div>
                <h3 className="text-lg font-medium text-suspect-text mb-4">Discord Notifications</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-suspect-text mb-2">
                      Discord Webhook URL
                    </label>
                    <input
                      type="text"
                      value={securitySettings.discord_webhook_url || ''}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        discord_webhook_url: e.target.value
                      }))}
                      className="input-field w-full"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                    <p className="text-xs text-suspect-gray-400 mt-1">
                      Discord webhook URL for stream notifications. Leave empty to disable notifications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveSecuritySettings}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? <LoadingDots /> : 'Save Settings'}
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
                <LoadingSpinner text="Loading activity logs" />
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
                  
                  <div className="text-center pt-4">
                    <button
                      onClick={loadMoreActivities}
                      disabled={activityLoading || activityLogs.length >= activityTotal}
                      className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {activityLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <LoadingDots size="sm" />
                          <span>Loading</span>
                        </div>
                      ) : `Load More (${activityLogs.length}/${activityTotal})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Invitation Keys Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-suspect-header rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-suspect-text mb-4">Generate Invitation Keys</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Key Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setKeyType('streamer')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      keyType === 'streamer'
                        ? 'border-suspect-primary bg-suspect-primary/10'
                        : 'border-suspect-gray-600 hover:border-suspect-gray-500'
                    }`}
                  >
                    <div className="text-left">
                      <h3 className="text-sm font-medium text-suspect-text">Streamer</h3>
                      <p className="text-xs text-suspect-gray-400">For streamer accounts</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyType('admin')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      keyType === 'admin'
                        ? 'border-suspect-primary bg-suspect-primary/10'
                        : 'border-suspect-gray-600 hover:border-suspect-gray-500'
                    }`}
                  >
                    <div className="text-left">
                      <h3 className="text-sm font-medium text-suspect-text">Admin</h3>
                      <p className="text-xs text-suspect-gray-400">For admin accounts</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
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

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateKeyModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={generateInvitationKeys}
                className="btn-primary"
              >
                Generate Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add AlertDialog component */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          deleteUser(deleteDialog.userId, deleteDialog.username)
          setDeleteDialog(prev => ({ ...prev, isOpen: false }))
        }}
        title="Delete User"
        message={`Are you sure you want to delete the user "${deleteDialog.username}"? This action cannot be undone and will permanently remove all their data including stream sessions, payouts, and account information.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Add another ConfirmDialog for key deletion */}
      <ConfirmDialog
        isOpen={deleteKeyDialog.isOpen}
        onClose={() => setDeleteKeyDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          deleteKey(deleteKeyDialog.keyId, deleteKeyDialog.keyCode, keyType, deleteKeyDialog.usedBy || null)
          setDeleteKeyDialog(prev => ({ ...prev, isOpen: false }))
        }}
        title="Delete Invitation Key"
        message={deleteKeyDialog.usedBy 
          ? `Are you sure you want to delete invitation key "${deleteKeyDialog.keyCode}"?\n\nThis will also DELETE the ${keyType} account that used this key: ${deleteKeyDialog.usedBy}\n\nThis action cannot be undone!`
          : `Are you sure you want to delete invitation key "${deleteKeyDialog.keyCode}"?\n\nThis action cannot be undone!`
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
} 