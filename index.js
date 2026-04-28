require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const express = require('express');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// --- Express Keep-Alive Server (for UptimeRobot) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('NME Encradant is online.');
});

app.listen(PORT, () => {
  console.log(`[Server] Keep-alive web server running on port ${PORT}`);
});

// --- Welcome Card Generator ---
async function generateWelcomeCard(member) {
  const width = 1024;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fetch full user to get banner
  const user = await member.user.fetch().catch(() => member.user);

  // Try user banner first, then guild banner, then fallback
  let bannerUrl = user.bannerURL({ size: 1024, format: 'png' });
  if (!bannerUrl && member.guild.bannerURL()) {
    bannerUrl = member.guild.bannerURL({ size: 1024, format: 'png' });
  }

  try {
    const bg = bannerUrl
      ? await loadImage(bannerUrl)
      : await loadImage('https://singlecolorimage.com/get/0c0c0c/1024x400');
    ctx.drawImage(bg, 0, 0, width, height);
  } catch {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0c0c0c');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Dark overlay for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, width, height);

  // Draw circular avatar with white border
  const avatarSize = 180;
  const avatarX = width / 2;
  const avatarY = height / 2;

  ctx.save();

  // White border circle
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2 + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.closePath();

  // Avatar clip
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(
      member.user.displayAvatarURL({ size: 256, format: 'png' })
    );
    ctx.drawImage(
      avatar,
      avatarX - avatarSize / 2,
      avatarY - avatarSize / 2,
      avatarSize,
      avatarSize
    );
  } catch (err) {
    console.error('[Canvas] Failed to load avatar:', err);
  }

  ctx.restore();

  return canvas.encode('png');
}

// --- Discord Bot ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', () => {
  console.log(`[Discord] Logged in as ${client.user.tag}`);
  client.user.setActivity('Noir Mirage Enterprise', { type: 'WATCHING' });
});

// --- Welcome Event ---
client.on('guildMemberAdd', async (member) => {
  const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
  if (!welcomeChannelId) return;

  const channel = await client.channels.fetch(welcomeChannelId).catch(() => null);
  if (!channel) return;

  try {
    const welcomeImageBuffer = await generateWelcomeCard(member);
    const attachment = new AttachmentBuilder(welcomeImageBuffer, {
      name: 'welcome.png',
    });

    const imageEmbed = new EmbedBuilder().setImage('attachment://welcome.png');

    const textEmbed = new EmbedBuilder()
      .setTitle('𝓦𝓮𝓵𝓬𝓸𝓶𝓮 𝓽𝓸 𝓝𝓸𝓲𝓻 𝓜𝓲𝓻𝓪𝓰𝓮 𝓔𝓷𝓽𝓮𝓻𝓹𝓻𝓲𝓼𝓮')
      .setDescription(
        `> 𝕋𝕙𝕒𝕟𝕜 𝕪𝕠𝕦 𝕗𝕠𝕣 𝕛𝕠𝕚𝕟𝕚𝕟𝕘 ℕ𝕠𝕚𝕣 𝕄𝕚𝕣𝕒𝕘𝕖 𝔼𝕟𝕥𝕖𝕣𝕡𝕣𝕚𝕤𝕖 [ℕ𝕄𝔼], ${member.user.toString()}!\n\n` +
        `> Step into a realm embodying nightclub lifestyle celebrated by a twist of French culture. This is not only a community, but a family, integrating morals and respect into gameplay. Noir Mirage Enterprise elevates these values with their love for music and social interaction. Come join us by applying today to explore more of that journey.\n\n` +
        `## _Our Lobby Services_\n` +
        `> <#1491946047159926915>\n` +
        `> <#1491931882319904838>\n` +
        `> <#1491976268835586141>\n` +
        `> <#1493453605372563456>`
      );

    await channel.send({
      content: member.user.toString(),
      files: [attachment],
      embeds: [imageEmbed, textEmbed],
    });
  } catch (err) {
    console.error('[Welcome] Error sending welcome message:', err);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    return message.reply('Pong! 🏓');
  }

  if (command === 'encradant') {
    return message.reply('I am NME Encradant, servant of Noir Mirage Enterprise.');
  }

  if (command === 'help') {
    const helpEmbed = {
      color: 0x2f3136,
      title: 'NME Encradant - Command List',
      description: 'Here are the available commands:',
      fields: [
        { name: '!ping', value: 'Check bot latency.' },
        { name: '!encradant', value: 'Learn about the bot.' },
        { name: '!help', value: 'Show this help message.' },
      ],
      footer: { text: 'Noir Mirage Enterprise' },
    };
    return message.reply({ embeds: [helpEmbed] });
  }
});

// Login using the TOKEN environment variable
client.login(process.env.TOKEN).catch((err) => {
  console.error('[Discord] Failed to login:', err.message);
  process.exit(1);
});

