class DiscordWebhook {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendWebhook(content) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending Discord webhook:', error);
    }
  }

  async notifyStreamStart(streamerUsername, tiktokUsername) {
    const content = {
      embeds: [{
        title: '🔴 Stream Started',
        description: `**${streamerUsername}** just went live!`,
        color: 0xFF0000, // Red color
        fields: [
          {
            name: 'TikTok Username',
            value: `@${tiktokUsername}`,
            inline: true
          },
          {
            name: 'Stream Link',
            value: `[Watch on TikTok](https://www.tiktok.com/@${tiktokUsername}/live)`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    await this.sendWebhook(content);
  }

  async notifyStreamEnd(streamerUsername, tiktokUsername, duration, totalViews) {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = hours > 0 
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

    const content = {
      embeds: [{
        title: '⏹️ Stream Ended',
        description: `**${streamerUsername}**'s stream has ended`,
        color: 0x00FF00, // Green color
        fields: [
          {
            name: 'TikTok Username',
            value: `@${tiktokUsername}`,
            inline: true
          },
          {
            name: 'Duration',
            value: durationStr,
            inline: true
          },
          {
            name: 'Total Views',
            value: totalViews.toLocaleString(),
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    await this.sendWebhook(content);
  }
}

module.exports = DiscordWebhook; 