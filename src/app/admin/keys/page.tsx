'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'

interface ProductKey {
  id: string
  key: string
  product_name?: string // Keep for backwards compatibility
  category_id?: string
  is_assigned: boolean
  assigned_to?: string
  assigned_at?: string
  created_at: string
  expires_at?: string
  hours_left?: number
  minutes_left?: number
  is_expired?: boolean
  streamers?: {
    id: string
    username: string
    tiktok_username: string
  }
  product_categories?: {
    id: string
    name: string
    description: string
  }
}

interface ProductCategory {
  id: string
  name: string
  description: string
  created_at: string
}

interface KeyRequest {
  id: string
  streamer_id: string
  streamer_username: string
  reason: string
  category_name?: string
  status: 'pending' | 'approved' | 'denied'
  admin_response?: string
  created_at: string
}

export default function AdminProductKeys() {
  const [productKeys, setProductKeys] = useState<ProductKey[]>([])
  const [keyRequests, setKeyRequests] = useState<KeyRequest[]>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'keys' | 'requests' | 'categories'>('requests')
  const [showAddKeyModal, setShowAddKeyModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')

  // Smart cache to avoid refetching data when switching tabs
  const [dataCache, setDataCache] = useState<{
    keys?: boolean
    requests?: boolean
    categories?: boolean
  }>({})

  useEffect(() => {
    fetchData()
  }, [activeTab])

  // Initial data load - fetch all data on first mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchProductCategories(),
        fetchProductKeys(),
        fetchKeyRequests()
      ])
      // Mark all data as initially loaded
      setDataCache({ keys: true, requests: false, categories: true }) // requests always fresh
    } catch (error) {
      console.error('Error fetching initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    // Key requests should always be fresh since they change frequently
    // Other tabs can use cache safely if data has been loaded
    if (dataCache[activeTab] && activeTab !== 'requests') {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      switch (activeTab) {
        case 'keys':
          await fetchProductKeys()
          setDataCache(prev => ({ ...prev, keys: true }))
          break
        case 'requests':
          await fetchKeyRequests()
          // Don't cache requests - always fresh
          break
        case 'categories':
          await fetchProductCategories()
          setDataCache(prev => ({ ...prev, categories: true }))
          break
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const fetchProductKeys = async () => {
    try {
      const response = await fetch('/api/product-keys')
      if (response.ok) {
        const data = await response.json()
        setProductKeys(data)
      }
    } catch (error) {
      console.error('Error fetching product keys:', error)
    }
  }

  const fetchKeyRequests = async () => {
    try {
      const response = await fetch('/api/key-requests')
      if (response.ok) {
        const data = await response.json()
        // Transform the data to match our interface
        const transformedRequests = data.map((request: any) => ({
          id: request.id,
          streamer_id: request.streamer_id,
          streamer_username: request.streamers?.username || 'Unknown',
          reason: request.product_name || request.product_categories?.name || 'Unknown',
          category_name: request.product_categories?.name,
          status: request.status,
          admin_response: request.admin_notes,
          created_at: request.created_at
        }))
        setKeyRequests(transformedRequests)
      }
    } catch (error) {
      console.error('Error fetching key requests:', error)
    }
  }

  const addKey = async () => {
    if (!newKeyValue.trim()) {
      alert('Please enter a valid key')
      return
    }

    if (!selectedCategoryId.trim()) {
      alert('Please select a category')
      return
    }

    try {
      const response = await fetch('/api/product-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: newKeyValue.trim(),
          category_id: selectedCategoryId.trim()
        })
      })

      if (response.ok) {
        await fetchProductKeys() // Refresh the list
        // Invalidate cache for keys tab
        setDataCache(prev => ({ ...prev, keys: false }))
        setShowAddKeyModal(false)
        setNewKeyValue('')
        setSelectedCategoryId('')
        alert('Key added successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding key:', error)
      alert('Error adding key')
    }
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name')
      return
    }

    try {
      const response = await fetch('/api/product-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim()
        })
      })

      if (response.ok) {
        await fetchProductCategories() // Refresh the list
        // Invalidate cache for categories tab
        setDataCache(prev => ({ ...prev, categories: false }))
        setShowAddCategoryModal(false)
        setNewCategoryName('')
        setNewCategoryDescription('')
        alert('Category added successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Error adding category')
    }
  }

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/product-categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: categoryId
        })
      })

      if (response.ok) {
        await fetchProductCategories() // Refresh the list
        // Invalidate cache for categories and keys tabs
        setDataCache(prev => ({ ...prev, categories: false, keys: false }))
        alert('Category deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error deleting category')
    }
  }

  const deleteKey = async (keyId: string, keyValue: string) => {
    if (!confirm(`Are you sure you want to delete the key "${keyValue}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/product-keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: keyId
        })
      })

      if (response.ok) {
        await fetchProductKeys() // Refresh the list
        await fetchProductCategories() // Refresh categories to update key counts
        // Invalidate cache for both keys and categories tabs
        setDataCache(prev => ({ ...prev, keys: false, categories: false }))
        alert('Key deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting key:', error)
      alert('Error deleting key')
    }
  }

  const handleRequestAction = async (requestId: string, status: 'approved' | 'denied', response?: string) => {
    try {
      const apiResponse = await fetch(`/api/key-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          admin_notes: response
        })
      })

      if (apiResponse.ok) {
        // Update local state
        setKeyRequests(prev => prev.map(request => 
          request.id === requestId
            ? { ...request, status, admin_response: response }
            : request
        ))

        // Refresh the product keys to show any new assignments
        await fetchProductKeys()
        // Invalidate cache for keys tab since assignments changed
        setDataCache(prev => ({ ...prev, keys: false }))
        
        alert(`Request ${status} successfully`)
      } else {
        const error = await apiResponse.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating request:', error)
      alert('Error updating request')
    }
  }

  // Helper function to get available key counts for a category
  const getCategoryKeyInfo = (categoryName?: string) => {
    const category = productCategories.find(c => c.name === categoryName)
    if (!category) {
      return {
        availableKeys: productKeys.filter(k => !k.is_assigned).length,
        categoryKeys: 0,
        hasMatchingCategory: false
      }
    }

    const categoryKeys = productKeys.filter(k => k.category_id === category.id)
    const availableInCategory = categoryKeys.filter(k => !k.is_assigned).length
    const totalAvailable = productKeys.filter(k => !k.is_assigned).length

    return {
      availableKeys: totalAvailable,
      categoryKeys: availableInCategory,
      hasMatchingCategory: true,
      categoryName: category.name
    }
  }

  const stats = {
    totalKeys: productKeys.length,
    usedKeys: productKeys.filter(k => k.is_assigned).length,
    availableKeys: productKeys.filter(k => !k.is_assigned).length,
    pendingRequests: keyRequests.filter(r => r.status === 'pending').length
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading product keys" />
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
              <span className="ml-2 text-suspect-gray-400">/ Product Keys</span>
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
            <h1 className="text-3xl font-bold text-suspect-text">Product Keys</h1>
            <p className="text-suspect-gray-400 mt-2">
              Manage product keys, categories, and streamer requests
            </p>
          </div>
          <div className="flex space-x-3">
            {activeTab === 'categories' ? (
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="btn-primary"
              >
                Add Category
              </button>
            ) : (
              <button
                onClick={() => setShowAddKeyModal(true)}
                className="btn-primary"
              >
                Add New Key
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-suspect-text">{stats.totalKeys}</p>
              <p className="text-suspect-gray-400 text-sm">Total Keys</p>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.availableKeys}</p>
              <p className="text-suspect-gray-400 text-sm">Available Keys</p>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.usedKeys}</p>
              <p className="text-suspect-gray-400 text-sm">Used Keys</p>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats.pendingRequests}</p>
              <p className="text-suspect-gray-400 text-sm">Pending Requests</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-8">
          <div className="border-b border-suspect-gray-700">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-suspect-primary text-suspect-primary'
                    : 'border-transparent text-suspect-gray-400 hover:text-suspect-gray-300'
                }`}
              >
                Key Requests ({stats.pendingRequests})
              </button>
              <button
                onClick={() => setActiveTab('keys')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'keys'
                    ? 'border-suspect-primary text-suspect-primary'
                    : 'border-transparent text-suspect-gray-400 hover:text-suspect-gray-300'
                }`}
              >
                All Keys ({stats.totalKeys})
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'categories'
                    ? 'border-suspect-primary text-suspect-primary'
                    : 'border-transparent text-suspect-gray-400 hover:text-suspect-gray-300'
                }`}
              >
                Categories ({productCategories.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'requests' ? (
              <div>
                <h2 className="text-xl font-semibold text-suspect-text mb-4">Key Requests</h2>
                <div className="overflow-x-auto">
                  <div className="max-h-96 overflow-y-auto border border-suspect-gray-700 rounded-lg">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-suspect-header z-10">
                        <tr className="border-b border-suspect-gray-700">
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Streamer</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Product Name</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Status</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Date</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keyRequests.map((request) => {
                          const keyInfo = getCategoryKeyInfo(request.category_name)
                          const canApprove = keyInfo.availableKeys > 0
                          
                          return (
                            <tr key={request.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                              <td className="text-suspect-text py-4 px-4 font-medium">
                                {request.streamer_username}
                              </td>
                              <td className="text-suspect-text py-4 px-4 max-w-xs">
                                <div>
                                  <div>{request.reason}</div>
                                  {keyInfo.hasMatchingCategory && request.status === 'pending' && (
                                    <div className="text-xs text-suspect-gray-400 mt-1">
                                      {keyInfo.categoryKeys > 0 ? (
                                        <span className="text-green-400">
                                          {keyInfo.categoryKeys} available in {keyInfo.categoryName}
                                        </span>
                                      ) : keyInfo.availableKeys > 0 ? (
                                        <span className="text-yellow-400">
                                          No {keyInfo.categoryName} keys, {keyInfo.availableKeys} other keys available
                                        </span>
                                      ) : (
                                        <span className="text-red-400">
                                          No keys available
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  request.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : request.status === 'denied'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {request.status}
                                </span>
                              </td>
                              <td className="text-suspect-gray-400 py-4 px-4">
                                {new Date(request.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                {request.status === 'pending' ? (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        if (!canApprove) {
                                          alert(`Cannot approve: No available keys in the system. Please add more keys before approving requests.`)
                                          return
                                        }
                                        handleRequestAction(request.id, 'approved', 'Request approved')
                                      }}
                                      className={`text-sm ${
                                        canApprove 
                                          ? 'text-green-400 hover:text-green-300'
                                          : 'text-gray-500 cursor-not-allowed'
                                      }`}
                                      disabled={!canApprove}
                                      title={canApprove ? 'Approve request' : 'No available keys'}
                                    >
                                      Approve {!canApprove && '⚠️'}
                                    </button>
                                    <button
                                      onClick={() => handleRequestAction(request.id, 'denied', 'Request denied')}
                                      className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                      Deny
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-suspect-gray-400 text-sm">
                                    {request.admin_response}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {keyRequests.length > 5 && (
                    <div className="text-center text-suspect-gray-400 text-sm mt-2">
                      Showing {keyRequests.length} requests • Scroll to view more
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'keys' ? (
              <div>
                <h2 className="text-xl font-semibold text-suspect-text mb-4">All Product Keys</h2>
                <div className="overflow-x-auto">
                  <div className="max-h-96 overflow-y-auto border border-suspect-gray-700 rounded-lg">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-suspect-header z-10">
                        <tr className="border-b border-suspect-gray-700">
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Key</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Product</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Status</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Assigned To</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Assigned Date</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Created</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productKeys.map((key) => (
                          <tr key={key.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                            <td className="text-suspect-text py-4 px-4 font-mono">
                              {key.key}
                            </td>
                            <td className="text-suspect-text py-4 px-4">
                              {key.product_categories?.name || key.product_name || 'Unknown'}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  key.is_assigned
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {key.is_assigned ? 'Assigned' : 'Available'}
                                </span>
                                {key.is_assigned && key.hours_left !== undefined && (
                                  <span className="text-xs text-red-400 font-medium">
                                    ⏰ {key.hours_left}h {key.minutes_left}m left
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-suspect-text py-4 px-4">
                              {key.streamers?.username || '-'}
                            </td>
                            <td className="text-suspect-gray-400 py-4 px-4">
                              <div>
                                <div>{key.assigned_at ? new Date(key.assigned_at).toLocaleDateString() : '-'}</div>
                                {key.is_assigned && key.expires_at && (
                                  <div className="text-xs text-red-400">
                                    Expires: {new Date(key.expires_at).toLocaleDateString()} at {new Date(key.expires_at).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="text-suspect-gray-400 py-4 px-4">
                              {new Date(key.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => deleteKey(key.id, key.key)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {productKeys.length > 6 && (
                    <div className="text-center text-suspect-gray-400 text-sm mt-2">
                      Showing {productKeys.length} keys • Scroll to view more
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-suspect-text mb-4">Product Categories</h2>
                <div className="overflow-x-auto">
                  <div className="max-h-80 overflow-y-auto border border-suspect-gray-700 rounded-lg">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-suspect-header z-10">
                        <tr className="border-b border-suspect-gray-700">
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Category Name</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Description</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Keys Count</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Created</th>
                          <th className="text-left text-suspect-gray-400 py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productCategories.map((category) => {
                          const keyCount = productKeys.filter(key => key.category_id === category.id).length
                          const hasKeys = keyCount > 0
                          return (
                            <tr key={category.id} className="border-b border-suspect-gray-800 hover:bg-suspect-gray-800/30 transition-colors">
                              <td className="text-suspect-text py-4 px-4 font-medium">
                                {category.name}
                              </td>
                              <td className="text-suspect-text py-4 px-4 max-w-xs">
                                {category.description || '-'}
                              </td>
                              <td className="text-suspect-text py-4 px-4">
                                {keyCount} keys
                              </td>
                              <td className="text-suspect-gray-400 py-4 px-4">
                                {new Date(category.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                {hasKeys ? (
                                  <span className="text-suspect-gray-400 text-sm" title="Cannot delete category with assigned keys">
                                    Cannot delete
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => deleteCategory(category.id, category.name)}
                                    className="text-red-400 hover:text-red-300 text-sm"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {productCategories.length > 4 && (
                    <div className="text-center text-suspect-gray-400 text-sm mt-2">
                      Showing {productCategories.length} categories • Scroll to view more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Key Modal */}
      {showAddKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-suspect-header rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-suspect-text mb-4">Add New Product Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Product Key
                </label>
                <input
                  type="text"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="Enter product key (e.g., SUSPECT-2024-ABC123)"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Product Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select a category</option>
                  {productCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <p className="text-suspect-gray-400 text-xs">
                Add the exact product key and assign it to a category
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddKeyModal(false)
                  setNewKeyValue('')
                  setSelectedCategoryId('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={addKey}
                className="btn-primary"
                disabled={!newKeyValue.trim() || !selectedCategoryId.trim()}
              >
                Add Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-suspect-header rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-suspect-text mb-4">Add New Category</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Premium Cheat Package"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-suspect-text mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Brief description of this product category..."
                  className="input-field w-full"
                  rows={3}
                />
              </div>
              
              <p className="text-suspect-gray-400 text-xs">
                Categories help organize product keys and make it easier for streamers to request the right type
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddCategoryModal(false)
                  setNewCategoryName('')
                  setNewCategoryDescription('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={addCategory}
                className="btn-primary"
                disabled={!newCategoryName.trim()}
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 