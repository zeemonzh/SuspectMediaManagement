import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { admin_notes } = body

    // Update the session notes
    const { data: updatedSession, error } = await supabase
      .from('stream_sessions')
      .update({
        admin_notes
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Stream session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: 'Session notes updated successfully'
    })

  } catch (error) {
    console.error('Error updating session notes:', error)
    return NextResponse.json(
      { error: 'Failed to update session notes' },
      { status: 500 }
    )
  }
} 