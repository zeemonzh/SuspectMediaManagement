'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import AlertDialog from '@/components/AlertDialog'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Payout {
  id: string
  streamer_id: string
  streamer_username: string
  amount: number
  month: string
  status: 'pending' | 'approved' | 'denied' | 'paid'
  calculated_amount: number
  admin_notes?: string
  paid_at?: string
  created_at: string
  type: 'request' | 'legacy'
  stream_session_id?: string
  duration_minutes?: number
  meets_time_goal?: boolean
  meets_viewer_goal?: boolean
  paypal_username?: string
}

export default function AdminPayouts() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied' | 'paid'>('all')

  // Add state for alerts and confirmations
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

  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState<{
    isOpen: boolean
    payout: Payout | null
  }>({
    isOpen: false,
    payout: null
  })

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/login')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (isAdmin) {
      fetchPayouts()
      
      // Set up auto-refresh for new payout requests
      const interval = setInterval(fetchPayouts, 60000) // Every minute
      
      return () => clearInterval(interval)
    }
  }, [isAdmin])

  const fetchPayouts = async () => {
    try {
      const response = await fetch('/api/admin/payouts')
      if (response.ok) {
        const data = await response.json()
        setPayouts(data)
      } else {
        console.error('Failed to fetch payouts')
      }
    } catch (error) {
      console.error('Error fetching payouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayouts = payouts.filter(payout => {
    if (filter === 'all') return true
    return payout.status === filter
  })

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = payouts.filter(p => p.status === 'paid' || p.status === 'approved').reduce((sum, p) => sum + p.amount, 0)

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertDialog({ isOpen: true, title, message, type })
  }

  const handleStatusUpdate = async (payoutId: string, status: string) => {
    try {
      const response = await fetch(`/api/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        showAlert('Success', 'Payout status updated successfully!', 'success')
        fetchPayouts() // Refresh the list
      } else {
        const error = await response.json()
        showAlert('Error', error.error || 'Error updating payout status', 'error')
      }
    } catch (error) {
      console.error('Error updating payout status:', error)
      showAlert('Error', 'Error updating payout status', 'error')
    }
  }

  const handlePayPalPayment = (payout: Payout) => {
    window.open(`https://paypal.com/paypalme/${payout.paypal_username}/${payout.amount}`, '_blank')
    setPaymentConfirmDialog({
      isOpen: true,
      payout
    })
  }

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen text="Loading payouts" />
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
              <span className="hidden sm:block ml-2 text-suspect-gray-400">/ Payouts</span>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-suspect-text">Payout Management</h1>
            <p className="text-suspect-gray-400 mt-2">
              Review streamer payout requests → Approve/Deny → Process payments via PayPal
            </p>
          </div>
        </div>

        {/* Workflow Info */}
        <div className="card p-6 mb-8 bg-blue-900/20 border-blue-500/30">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">💡 How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs">1</span>
              <span className="text-suspect-gray-300">Streamers request payouts (with PayPal username)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">2</span>
              <span className="text-suspect-gray-300">Admin reviews and approves/denies requests</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">3</span>
              <span className="text-suspect-gray-300">Superadmin clicks "Pay via PayPal" to send money</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-400/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400 group-hover:scale-110 transition-transform duration-300">${totalPending.toFixed(2)}</p>
              <p className="text-suspect-gray-400 text-sm">Pending Payouts</p>
            </div>
          </div>
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-green-400/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400 group-hover:scale-110 transition-transform duration-300">${totalPaid.toFixed(2)}</p>
              <p className="text-suspect-gray-400 text-sm">Paid This Month</p>
            </div>
          </div>
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-suspect-primary/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-suspect-primary group-hover:scale-110 transition-transform duration-300">{payouts.filter(p => p.status === 'pending').length}</p>
              <p className="text-suspect-gray-400 text-sm">Pending Count</p>
            </div>
          </div>
          <div className="card p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-suspect-text/10 group">
            <div className="text-center">
              <p className="text-2xl font-bold text-suspect-text group-hover:scale-110 transition-transform duration-300">{payouts.length}</p>
              <p className="text-suspect-gray-400 text-sm">Total Payouts</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <span className="text-suspect-text font-medium">Filter:</span>
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'approved', 'denied', 'paid'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-suspect-primary text-white'
                      : 'bg-suspect-gray-700 text-suspect-gray-400 hover:bg-suspect-gray-600'
                  }`}
                >
                  <span className="sm:hidden">{status.charAt(0).toUpperCase() + status.slice(1)} ({
                    status === 'all' ? payouts.length : payouts.filter(p => p.status === status).length
                  })</span>
                  <span className="hidden sm:inline">{status.charAt(0).toUpperCase() + status.slice(1)} ({
                    status === 'all' ? payouts.length : payouts.filter(p => p.status === status).length
                  })</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            <div className="max-h-[500px] overflow-y-auto border border-suspect-gray-700 rounded-lg">
              <table className="w-full">
                <thead className="sticky top-0 bg-suspect-header z-10">
                  <tr className="border-b border-suspect-gray-700">
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Streamer</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">PayPal</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Amount</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Status</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Stream Info</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Date</th>
                    <th className="text-left text-suspect-gray-400 py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.map((payout, index) => (
                    <tr 
                      key={payout.id} 
                      className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/50 transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="text-suspect-text py-4 px-4 font-medium">
                        {payout.streamer_username}
                        {payout.type === 'request' && (
                          <span className="ml-2 px-1 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded">
                            Stream
                          </span>
                        )}
                      </td>
                      <td className="text-suspect-text py-4 px-4">
                        {payout.paypal_username ? (
                          <span className="text-sm font-mono bg-gray-800 px-2 py-1 rounded">
                            {payout.paypal_username}
                          </span>
                        ) : (
                          <span className="text-suspect-gray-500 text-sm">
                            {payout.type === 'legacy' ? 'Legacy payout' : 'Not provided'}
                          </span>
                        )}
                      </td>
                      <td className="text-suspect-text py-4 px-4">
                        ${payout.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payout.status === 'paid' || payout.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : payout.status === 'denied'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="text-suspect-gray-400 py-4 px-4">
                        {payout.type === 'request' ? (
                          <div className="text-xs">
                            {payout.duration_minutes && (
                              <div>⏱️ {Math.floor(payout.duration_minutes / 60)}h {payout.duration_minutes % 60}m</div>
                            )}
                            {payout.meets_time_goal !== undefined && (
                              <div className="flex space-x-1 mt-1">
                                <span className={payout.meets_time_goal ? 'text-green-400' : 'text-red-400'}>
                                  {payout.meets_time_goal ? '✓' : '✗'} Time
                                </span>
                                <span className={payout.meets_viewer_goal ? 'text-green-400' : 'text-red-400'}>
                                  {payout.meets_viewer_goal ? '✓' : '✗'} Views
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-suspect-gray-500">
                            {payout.month || 'Legacy payout'}
                          </span>
                        )}
                      </td>
                      <td className="text-suspect-gray-400 py-4 px-4">
                        {((payout.status === 'paid' || payout.status === 'approved') && payout.paid_at)
                          ? new Date(payout.paid_at).toLocaleDateString()
                          : new Date(payout.created_at).toLocaleDateString()
                        }
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          {payout.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(payout.id, 'approved')}
                                className="text-green-400 hover:text-green-300 text-sm font-medium"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(payout.id, 'denied')}
                                className="text-red-400 hover:text-red-300 text-sm font-medium"
                              >
                                ✗ Deny
                              </button>
                            </>
                          ) : payout.status === 'approved' ? (
                            <div className="flex space-x-2">
                              {payout.paypal_username ? (
                                <button
                                  onClick={() => handlePayPalPayment(payout)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium"
                                >
                                  💰 Pay via PayPal
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusUpdate(payout.id, 'paid')}
                                  className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          ) : payout.status === 'denied' ? (
                            <button
                              onClick={() => handleStatusUpdate(payout.id, 'pending')}
                              className="text-yellow-400 hover:text-yellow-300 text-sm"
                            >
                              🔄 Reopen
                            </button>
                          ) : (
                            <span className="text-green-500 text-sm font-medium">✅ Paid</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredPayouts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-suspect-gray-400">No payouts found for the selected filter.</p>
              </div>
            )}
            
            {filteredPayouts.length > 8 && (
              <div className="text-center text-suspect-gray-400 text-sm mt-2">
                Showing {filteredPayouts.length} payouts • Scroll to view more
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add AlertDialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      {/* Add PaymentConfirmDialog */}
      <ConfirmDialog
        isOpen={paymentConfirmDialog.isOpen}
        onClose={() => setPaymentConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (paymentConfirmDialog.payout) {
            handleStatusUpdate(paymentConfirmDialog.payout.id, 'paid')
          }
          setPaymentConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }}
        title="Confirm PayPal Payment"
        message={paymentConfirmDialog.payout ? 
          `Did you successfully send $${paymentConfirmDialog.payout.amount} to ${paymentConfirmDialog.payout.streamer_username} via PayPal?\n\nClick Confirm only after you've completed the payment.` 
          : 'Confirm payment completion'
        }
        confirmText="Confirm Payment"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  )
} 