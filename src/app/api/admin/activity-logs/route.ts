import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get('category') || 'all'
    const limit = parseInt(url.searchParams.get('limit') || '25')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const activities: ActivityLog[] = []
    
    // Optimize: Use Promise.all for parallel queries instead of sequential
    const queries = []
    
    // Get user registrations and account activities
    if (category === 'all' || category === 'user') {
      queries.push(
        supabase
          .from('streamers')
          .select('id, username, email, tiktok_username, role, created_at, is_active')
          .order('created_at', { ascending: false })
          .limit(limit)
          .then(({ data: users }) => {
            if (users) {
              users.forEach((user: any) => {
                activities.push({
                  id: `user-registered-${user.id}`,
                  type: 'user_registered',
                  message: `New ${user.role} account created: ${user.username}`,
                  timestamp: user.created_at,
                  user: user.username,
                  category: 'user',
                  status: user.is_active ? 'active' : 'inactive',
                  details: {
                    email: user.email,
                    tiktok_username: user.tiktok_username,
                    role: user.role
                  }
                })
              })
            }
          })
      )
    }

    // Get key request activities
    if (category === 'all' || category === 'key') {
      queries.push(
        supabase
          .from('key_requests')
          .select(`
            id, status, created_at, admin_notes,
            streamers!inner (username),
            product_categories!inner (name)
          `)
          .order('created_at', { ascending: false })
          .limit(limit)
          .then(({ data: keyRequests }) => {
            if (keyRequests) {
              keyRequests.forEach((request: any) => {
                const categoryName = request.product_categories?.name || 'Unknown Category'
                const streamerName = request.streamers?.username || 'Unknown'
                
                let message = ''
                switch (request.status) {
                  case 'pending':
                    message = `${streamerName} requested ${categoryName} key`
                    break
                  case 'approved':
                    message = `${categoryName} key approved for ${streamerName}`
                    break
                  case 'denied':
                    message = `${categoryName} key request denied for ${streamerName}`
                    break
                  default:
                    message = `${categoryName} key request ${request.status} for ${streamerName}`
                }
                
                activities.push({
                  id: `key-request-${request.id}`,
                  type: 'key_request',
                  message,
                  timestamp: request.created_at,
                  user: streamerName,
                  category: 'key',
                  status: request.status,
                  details: {
                    category: categoryName,
                    admin_notes: request.admin_notes
                  }
                })
              })
            }
          })
      )
    }

    // Get payout request activities
    if (category === 'all' || category === 'payout') {
      queries.push(
        supabase
          .from('payout_requests')
          .select(`
            id, status, requested_amount, created_at, payout_method, admin_notes,
            streamers!inner (username)
          `)
          .order('created_at', { ascending: false })
          .limit(limit)
          .then(({ data: payoutRequests }) => {
            if (payoutRequests) {
              payoutRequests.forEach((payout: any) => {
                const streamerName = payout.streamers?.username || 'Unknown'
                
                let message = ''
                switch (payout.status) {
                  case 'pending':
                    message = `${streamerName} requested $${payout.requested_amount.toFixed(2)} payout`
                    break
                  case 'approved':
                    message = `$${payout.requested_amount.toFixed(2)} payout approved for ${streamerName}`
                    break
                  case 'paid':
                    message = `$${payout.requested_amount.toFixed(2)} payout paid to ${streamerName}`
                    break
                  case 'denied':
                    message = `$${payout.requested_amount.toFixed(2)} payout denied for ${streamerName}`
                    break
                  default:
                    message = `$${payout.requested_amount.toFixed(2)} payout ${payout.status} for ${streamerName}`
                }
                
                activities.push({
                  id: `payout-request-${payout.id}`,
                  type: 'payout_request',
                  message,
                  timestamp: payout.created_at,
                  user: streamerName,
                  category: 'payout',
                  status: payout.status,
                  details: {
                    amount: payout.requested_amount,
                    method: payout.payout_method,
                    admin_notes: payout.admin_notes
                  }
                })
              })
            }
          })
      )
    }

    // Activity from invitation keys
    if (category === 'all' || category === 'system') {
      queries.push(
        supabase
          .from('admin_invitations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
          .then(({ data: invitationKeys }) => {
            if (invitationKeys) {
              invitationKeys.forEach((key: any) => {
                // Key creation activity
                activities.push({
                  id: `key-created-${key.id}`,
                  type: 'invitation_key_created',
                  message: `Admin invitation key generated: ${key.invitation_key}`,
                  timestamp: key.created_at,
                  user: 'System',
                  category: 'system',
                  status: 'created',
                  details: { code: key.invitation_key }
                })

                // Key usage activity (if used)
                if (key.used_at && key.used_by) {
                  activities.push({
                    id: `key-used-${key.id}`,
                    type: 'invitation_key_used',
                    message: `Admin invitation key ${key.invitation_key} used for registration`,
                    timestamp: key.used_at,
                    user: 'Admin User',
                    category: 'system',
                    status: 'used',
                    details: { code: key.invitation_key }
                  })
                }
              })
            }
          })
      )
    }

    // Execute all queries in parallel
    await Promise.all(queries)

    // Sort all activities by timestamp (most recent first) and apply limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const limitedActivities = activities.slice(offset, offset + limit)

    // Get total count efficiently (estimate based on category)
    let totalEstimate = activities.length
    if (category === 'all') {
      totalEstimate = Math.max(totalEstimate, limit * 2) // Rough estimate for pagination
    }

    return NextResponse.json({
      activities: limitedActivities,
      total: totalEstimate,
      hasMore: limitedActivities.length === limit
    })

  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
} 