import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Manual cleanup of orphaned sessions requested...');
    
    // End any sessions that don't have an end_time and are older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const { data: orphanedSessions, error } = await supabase
      .from('stream_sessions')
      .update({ 
        end_time: new Date().toISOString(),
        duration_minutes: 1 // Minimal duration for orphaned sessions
      })
      .is('end_time', null)
      .lt('start_time', fiveMinutesAgo.toISOString())
      .select('id, streamer_id, start_time');

    if (error) throw error;
    
    const cleanedCount = orphanedSessions?.length || 0;
    console.log(`🧹 Manually cleaned up ${cleanedCount} orphaned sessions`);

    return NextResponse.json({
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} orphaned sessions`
    });

  } catch (error) {
    console.error('Error during manual cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' },
      { status: 500 }
    );
  }
} 