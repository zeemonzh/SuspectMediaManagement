import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const activities: ActivityLog[] = []
    
    // Get user registrations and account activities
    if (category === 'all' || category === 'user') {
      const { data: users } = await supabase
        .from('streamers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

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
    }

    // Get key request activities
    if (category === 'all' || category === 'key') {
      const { data: keyRequests } = await supabase
        .from('key_requests')
        .select(`
          *,
          streamers (username),
          product_categories (name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (keyRequests) {
        keyRequests.forEach((request: any) => {
          const categoryName = request.product_categories?.name || 'Unknown Category'
          const streamerName = request.streamers?.username || 'Unknown'
          
          let message = ''
          let status = request.status
          
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
            status,
            details: {
              category: categoryName,
              admin_notes: request.admin_notes
            }
          })
        })
      }
    }

    // Get payout request activities
    if (category === 'all' || category === 'payout') {
      const { data: payoutRequests } = await supabase
        .from('payout_requests')
        .select(`
          *,
          streamers (username)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (payoutRequests) {
        payoutRequests.forEach((payout: any) => {
          const streamerName = payout.streamers?.username || 'Unknown'
          
          let message = ''
          let status = payout.status
          
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
            status,
            details: {
              amount: payout.requested_amount,
              method: payout.payout_method,
              admin_notes: payout.admin_notes
            }
          })
        })
      }
    }

    // Get invitation key activities
    if (category === 'all' || category === 'system') {
      const { data: invitationKeys } = await supabase
        .from('invitation_keys')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (invitationKeys) {
        invitationKeys.forEach((key: any) => {
          // Key creation activity
          activities.push({
            id: `key-created-${key.id}`,
            type: 'invitation_key_created',
            message: `Invitation key generated: ${key.code}`,
            timestamp: key.created_at,
            user: 'System',
            category: 'system',
            status: 'created',
            details: {
              code: key.code
            }
          })

          // Key usage activity (if used)
          if (key.used_at && key.used_by) {
            activities.push({
              id: `key-used-${key.id}`,
              type: 'invitation_key_used',
              message: `Invitation key ${key.code} used for registration`,
              timestamp: key.used_at,
              user: key.used_by,
              category: 'system',
              status: 'used',
              details: {
                code: key.code
              }
            })
          }
        })
      }
    }



    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply limit after sorting
    const limitedActivities = activities.slice(0, limit)

    return NextResponse.json({
      activities: limitedActivities,
      total: activities.length,
      hasMore: activities.length >= limit
    })

  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
} 