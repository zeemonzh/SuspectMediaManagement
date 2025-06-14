// Load environment variables
require('dotenv').config();

const { WebcastPushConnection } = require('tiktok-live-connector');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class StreamTracker {
  constructor() {
    this.activeConnections = new Map();
    this.streamSessions = new Map();
  }

  async getActiveStreamers() {
    try {
      const { data: streamers, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('is_active', true)
        .eq('role', 'streamer'); // Only track actual streamers, not admin accounts
      
      if (error) throw error;
      
      // Debug logging
      console.log('🔍 Active streamers found:', streamers?.map(s => ({
        id: s.id,
        username: s.username,
        tiktok_username: s.tiktok_username,
        is_active: s.is_active
      })));
      
      return streamers;
    } catch (error) {
      console.error('Error fetching streamers:', error);
      return [];
    }
  }

  async startTracking(streamer) {
    const { id, tiktok_username } = streamer;
    
    if (this.activeConnections.has(id)) {
      console.log(`Already tracking ${tiktok_username}`);
      return;
    }

    try {
      const connection = new WebcastPushConnection(tiktok_username, {
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestPollingIntervalMs: 1000,
      });

      // Store connection
      this.activeConnections.set(id, connection);

      connection.connect().then(state => {
        console.log(`✅ Connected to ${tiktok_username}:`, state);
        
        // Create new stream session
        this.createStreamSession(id);
        
      }).catch(err => {
        console.error(`❌ Failed to connect to ${tiktok_username}:`, err);
        this.activeConnections.delete(id);
      });

      // Event listeners
      connection.on('roomUser', (data) => {
        const viewerCount = data.viewerCount || 0;
        console.log(`[ROOM_USER_EVENT] StreamerID: ${id}, TikTok's ViewerCount: ${viewerCount}`);
        this.updateCurrentViewerCount(id, viewerCount);
      });

      connection.on('member', (data) => {
        // Count every join as a view, even rejoins
        console.log(`[MEMBER_JOIN_EVENT] StreamerID: ${id}, UserID: ${data.userId}, Username: ${data.uniqueId}`);
        this.handleViewCount(id, data.userId, data.uniqueId);
      });

      connection.on('like', (data) => {
        this.updateLikeCount(id, data.totalLikeCount);
      });

      connection.on('streamEnd', () => {
        console.log(`🔴 Stream ended for ${tiktok_username}`);
        this.endStreamSession(id);
        this.activeConnections.delete(id);
      });

      connection.on('disconnect', () => {
        console.log(`📡 Disconnected from ${tiktok_username}`);
        this.endStreamSession(id);
        this.activeConnections.delete(id);
      });

    } catch (error) {
      console.error(`Error setting up tracking for ${tiktok_username}:`, error);
    }
  }

  async createStreamSession(streamerId) {
    console.log(`[createStreamSession] Called for StreamerID: ${streamerId}`);
    try {
      const { data, error } = await supabase
        .from('stream_sessions')
        .insert({
          streamer_id: streamerId,
          start_time: new Date().toISOString(),
          peak_viewers: 0,
          average_viewers: 0,
          current_viewers: 0,
          total_viewers: 0, // Now represents total views instead of unique viewers
          total_likes: 0
        })
        .select()
        .single();

      if (error) {
        console.error(`[createStreamSession] Supabase error for StreamerID: ${streamerId}:`, error);
        throw error;
      }
      
      this.streamSessions.set(streamerId, {
        sessionId: data.id,
        startTime: new Date(),
        viewerCountsHistory: [], // For calculating average viewers
        total_views: 0, // New counter for total views
        currentLikes: 0
      });

      console.log(`[createStreamSession] Session created for StreamerID: ${streamerId}, SessionID: ${data.id}`);
    } catch (error) {
      console.error(`[createStreamSession] General error for StreamerID: ${streamerId}:`, error);
    }
  }

  async handleViewCount(streamerId, userId, username) {
    const session = this.streamSessions.get(streamerId);
    if (!session) {
      console.error(`[handleViewCount] Session not found for StreamerID: ${streamerId}`);
      return;
    }

    // Initialize total_views if not exists
    if (!session.total_views) {
      session.total_views = 0;
    }

    // Increment view count for every join
    session.total_views++;
    console.log(`[handleViewCount] New view from ${username || 'unknown'} (${userId}). Total views: ${session.total_views}`);

    try {
      await supabase
        .from('stream_sessions')
        .update({
          total_viewers: session.total_views // Repurposing total_viewers field to store total views
        })
        .eq('id', session.sessionId);
      console.log(`[handleViewCount] Successfully updated total views to ${session.total_views}`);
    } catch (error) {
      console.error(`[handleViewCount] Error updating total views:`, error);
    }
  }

  async updateCurrentViewerCount(streamerId, currentViewerCountFromTikTok) {
    console.log(`[updateCurrentViewerCount] Called for StreamerID: ${streamerId}, currentViewerCountFromTikTok: ${currentViewerCountFromTikTok}`);
    const session = this.streamSessions.get(streamerId);
    if (!session) {
      console.error(`[updateCurrentViewerCount] Session not found for StreamerID: ${streamerId}`);
      return;
    }

    session.viewerCountsHistory.push(currentViewerCountFromTikTok);
    const peakViewers = Math.max(...session.viewerCountsHistory, 0); // Calculate peak from history

    // Calculate average viewers
    const avgViewers = session.viewerCountsHistory.length > 0 ? Math.round(
      session.viewerCountsHistory.reduce((a, b) => a + b, 0) / session.viewerCountsHistory.length
    ) : 0;
    console.log(`[updateCurrentViewerCount] Calculated: peakViewers: ${peakViewers}, avgViewers: ${avgViewers}`);

    try {
      console.log(`[updateCurrentViewerCount] Updating Supabase for session ${session.sessionId} with: peak: ${peakViewers}, avg: ${avgViewers}, current: ${currentViewerCountFromTikTok}`);
      await supabase
        .from('stream_sessions')
        .update({
          peak_viewers: peakViewers,
          average_viewers: avgViewers,
          current_viewers: currentViewerCountFromTikTok
        })
        .eq('id', session.sessionId);
      console.log(`[updateCurrentViewerCount] Supabase update successful for session ${session.sessionId}`);
    } catch (error) {
      console.error(`[updateCurrentViewerCount] Error updating Supabase for session ${session.sessionId}:`, error);
    }
  }

  async updateLikeCount(streamerId, totalLikes) {
    const session = this.streamSessions.get(streamerId);
    if (!session) return;

    session.currentLikes = totalLikes;

    try {
      await supabase
        .from('stream_sessions')
        .update({ total_likes: totalLikes })
        .eq('id', session.sessionId);
    } catch (error) {
      console.error('Error updating like count:', error);
    }
  }

  async endStreamSession(streamerId) {
    const session = this.streamSessions.get(streamerId);
    if (!session) {
      // Clean up any orphaned sessions for this streamer
      console.log(`🧹 Cleaning up any orphaned sessions for streamer ${streamerId}`);
      try {
        await supabase
          .from('stream_sessions')
          .update({ end_time: new Date().toISOString() })
          .eq('streamer_id', streamerId)
          .is('end_time', null);
      } catch (error) {
        console.error('Error cleaning up orphaned sessions:', error);
      }
      return;
    }

    const endTime = new Date();
    const durationMinutes = Math.round((endTime - session.startTime) / 60000);
    
    const avgViewers = session.viewerCountsHistory.length > 0 
      ? Math.round(session.viewerCountsHistory.reduce((a, b) => a + b, 0) / session.viewerCountsHistory.length)
      : 0;

    try {
      await supabase
        .from('stream_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          average_viewers: avgViewers,
          peak_viewers: session.peakViewers,
          total_likes: session.currentLikes,
          total_viewers: session.total_views,
          current_viewers: 0
        })
        .eq('id', session.sessionId);

      // Update streamer's monthly stats
      await this.updateMonthlyStats(streamerId, durationMinutes, avgViewers);
      
      console.log(`✅ Ended session for streamer ${streamerId} - Duration: ${durationMinutes}m, Avg Viewers: ${avgViewers}`);
    } catch (error) {
      console.error('Error ending stream session:', error);
    }

    this.streamSessions.delete(streamerId);
  }

  async updateMonthlyStats(streamerId, durationMinutes, avgViewers) {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const durationHours = durationMinutes / 60;

    try {
      // Get or create current month's goal
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('streamer_id', streamerId)
        .eq('month', currentMonth)
        .single();

      if (goalError && goalError.code !== 'PGRST116') {
        throw goalError;
      }

      if (goal) {
        // Update existing goal
        const newHours = goal.current_hours + durationHours;
        const newAvgViewers = Math.round((goal.current_avg_viewers + avgViewers) / 2);

        await supabase
          .from('goals')
          .update({
            current_hours: newHours,
            current_avg_viewers: newAvgViewers,
            is_completed: newHours >= goal.target_hours && newAvgViewers >= goal.target_viewers
          })
          .eq('id', goal.id);
      }
    } catch (error) {
      console.error('Error updating monthly stats:', error);
    }
  }

  async updateTotalViewers(streamerId, currentViewerCount) {
    const session = this.streamSessions.get(streamerId);
    if (!session) {
      console.error(`[updateTotalViewers] Session not found for StreamerID: ${streamerId}`);
      return;
    }

    // Get current total from total_views
    const currentTotal = session.total_views;
    
    // If current viewer count is higher than our tracked total, update the total
    if (currentViewerCount > currentTotal) {
      console.log(`[updateTotalViewers] Updating total viewers from ${currentTotal} to ${currentViewerCount} for StreamerID: ${streamerId}`);
      
      try {
        await supabase
          .from('stream_sessions')
          .update({
            total_viewers: currentViewerCount
          })
          .eq('id', session.sessionId);
          
        console.log(`[updateTotalViewers] Successfully updated total viewers to ${currentViewerCount}`);
      } catch (error) {
        console.error(`[updateTotalViewers] Error updating total viewers:`, error);
      }
    }
  }

  async start() {
    console.log('🚀 Starting SuspectCheats Stream Tracker...');
    
    // Clean up any orphaned sessions from previous runs
    await this.cleanupOrphanedSessions();
    
    // Initial load of streamers
    const streamers = await this.getActiveStreamers();
    console.log(`📋 Found ${streamers.length} active streamers`);

    // Start tracking all active streamers
    for (const streamer of streamers) {
      await this.startTracking(streamer);
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check for new streamers and remove deactivated ones every 3 minutes
    setInterval(async () => {
      const currentStreamers = await this.getActiveStreamers();
      const currentStreamerIds = new Set(currentStreamers.map(s => s.id));
      
      // Start tracking new streamers
      for (const streamer of currentStreamers) {
        if (!this.activeConnections.has(streamer.id)) {
          console.log(`🆕 Found new streamer: ${streamer.tiktok_username}`);
          await this.startTracking(streamer);
        }
      }

      // Stop tracking deactivated streamers
      for (const [streamerId, connection] of this.activeConnections) {
        if (!currentStreamerIds.has(streamerId)) {
          console.log(`🛑 Streamer ${streamerId} was deactivated, stopping tracking`);
          connection.disconnect();
          this.endStreamSession(streamerId);
          this.activeConnections.delete(streamerId);
        }
      }
    }, 3 * 60 * 1000);

    console.log('✅ Stream tracker is running!');
  }

  async cleanupOrphanedSessions() {
    try {
      console.log('🧹 Cleaning up orphaned sessions from previous runs...');
      
      // End any sessions that don't have an end_time and are older than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const { data: orphanedSessions, error } = await supabase
        .from('stream_sessions')
        .update({ 
          end_time: new Date().toISOString(),
          duration_minutes: 1 // Minimal duration for orphaned sessions
        })
        .is('end_time', null)
        .lt('start_time', tenMinutesAgo.toISOString())
        .select('id, streamer_id');

      if (error) throw error;
      
      if (orphanedSessions && orphanedSessions.length > 0) {
        console.log(`🧹 Cleaned up ${orphanedSessions.length} orphaned sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up orphaned sessions:', error);
    }
  }

  stop() {
    console.log('🛑 Stopping stream tracker...');
    for (const [streamerId, connection] of this.activeConnections) {
      connection.disconnect();
      this.endStreamSession(streamerId);
    }
    this.activeConnections.clear();
    this.streamSessions.clear();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  if (tracker) {
    tracker.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  if (tracker) {
    tracker.stop();
  }
  process.exit(0);
});

// Start the tracker
const tracker = new StreamTracker();
tracker.start().catch(console.error); 