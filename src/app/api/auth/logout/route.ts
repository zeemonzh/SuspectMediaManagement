import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // For server-side logout, we mainly need to clear any server sessions
    // The actual logout happens on the client side with supabase.auth.signOut()
    
    // Log the logout attempt
    console.log('Logout API endpoint called')

    const response = NextResponse.json({ success: true, message: 'Logout endpoint reached successfully' })
    
    // Clear potential auth cookies as a safety measure
    response.cookies.set('sb-access-token', '', { 
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    })
    response.cookies.set('sb-refresh-token', '', { 
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    })

    return response
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during logout' },
      { status: 500 }
    )
  }
}

// Handle GET requests (in case browser tries GET instead of POST)
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for logout.' },
    { status: 405 }
  )
} 