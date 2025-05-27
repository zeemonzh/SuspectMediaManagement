import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH - Update streamer
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    const { data: streamer, error } = await supabase
      .from('streamers')
      .update(body)
      .eq('id', id)
      .eq('role', 'streamer')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(streamer)
  } catch (error) {
    console.error('Error updating streamer:', error)
    return NextResponse.json(
      { error: 'Failed to update streamer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete streamer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { error } = await supabase
      .from('streamers')
      .delete()
      .eq('id', id)
      .eq('role', 'streamer')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting streamer:', error)
    return NextResponse.json(
      { error: 'Failed to delete streamer' },
      { status: 500 }
    )
  }
} 