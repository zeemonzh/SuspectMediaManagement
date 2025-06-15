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
      content: "<@&1369742622708727868>",
      embeds: [{
        title: '🎥 Stream Started',
        description: `**[${streamerUsername}](https://www.tiktok.com/@${tiktokUsername}/live)** just went live!`,
        color: 0x57F287, // Discord green
        thumbnail: {
          url: "https://cdn.discordapp.com/emojis/1012900547269664858.gif" // You might want to replace this with your own animated streaming icon
        },
        fields: [
          {
            name: '🎯 Platform',
            value: 'TikTok',
            inline: true
          },
          {
            name: '👤 Username',
            value: `[@${tiktokUsername}](https://www.tiktok.com/@${tiktokUsername}/live)`,
            inline: true
          }
        ],
        footer: {
          text: '🔴 Live Now',
          icon_url: "https://cdn.discordapp.com/emojis/1012900547269664858.gif" // Optional: streaming icon
        },
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
      content: "<@&1369742622708727868>",
      embeds: [{
        title: '📡 Stream Ended',
        description: `**${streamerUsername}**'s stream has concluded`,
        color: 0xED4245, // Discord red
        thumbnail: {
          url: "https://cdn.discordapp.com/emojis/1012900585748676628.gif" // You might want to replace this with your own end stream icon
        },
        fields: [
          {
            name: '👤 Streamer',
            value: `[@${tiktokUsername}](https://www.tiktok.com/@${tiktokUsername})`,
            inline: true
          },
          {
            name: '⏱️ Duration',
            value: durationStr,
            inline: true
          },
          {
            name: '👥 Total Views',
            value: totalViews.toLocaleString(),
            inline: true
          }
        ],
        footer: {
          text: '⚫ Stream Ended',
          icon_url: "https://cdn.discordapp.com/emojis/1012900585748676628.gif" // Optional: end stream icon
        },
        timestamp: new Date().toISOString()
      }]
    };

    await this.sendWebhook(content);
  }
}

module.exports = DiscordWebhook; 