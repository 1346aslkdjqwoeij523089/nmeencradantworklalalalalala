require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType } = require('discord.js');
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

// --- Nickname Permission Helper ---
const ALLOWED_NICK_ROLES = [
  '1490149356983160932',
  '1490150944766165145',
  '1490151698906353766',
  '1490150602771271720',
];

function canChangeNickname(executorMember, targetMember) {
  const guild = executorMember.guild;
  if (guild.ownerId === executorMember.id) return { allowed: true };

  if (executorMember.permissions.has('ADMINISTRATOR')) {
    if (targetMember.roles.highest.position >= executorMember.roles.highest.position) {
      return { allowed: false, reason: 'You cannot change the nickname of someone with a higher or equal role.' };
    }
    return { allowed: true };
  }

  const hasAllowedRole = ALLOWED_NICK_ROLES.some(roleId => executorMember.roles.cache.has(roleId));
  if (!hasAllowedRole) {
    return { allowed: false, reason: 'You do not have permission to use this command.' };
  }

  if (targetMember.roles.highest.position >= executorMember.roles.highest.position) {
    return { allowed: false, reason: 'You cannot change the nickname of someone with a higher or equal role.' };
  }

  return { allowed: true };
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

client.once('ready', async () => {
  console.log(`[Discord] Logged in as ${client.user.tag}`);
  client.user.setActivity('Noir Mirage Enterprise', { type: 'WATCHING' });

  const nickCommand = {
    name: 'nick',
    description: "Change a user's nickname",
    options: [
      {
        name: 'user',
        type: ApplicationCommandOptionType.User,
        description: 'The user to rename',
        required: true,
      },
      {
        name: 'nickname',
        type: ApplicationCommandOptionType.String,
        description: 'The new nickname',
        required: true,
      },
    ],
  };

  try {
    await client.application.commands.set([nickCommand]);
    console.log('[Discord] Registered /nick slash command globally.');
  } catch (err) {
    console.error('[Discord] Failed to register slash commands:', err);
  }
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

  const prefix = '=';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    return message.reply('Pong! 🏓');
  }

  if (command === 'encadrant') {
    return message.reply('I am NME Encadrant, servant of Noir Mirage Enterprise.');
  }

  if (command === 'help') {
    const helpEmbed = {
      color: 0x2f3136,
      title: 'NME Dncadrant - Command List',
      description: 'Here are the available commands:',
      fields: [
        { name: '=ping', value: 'Check bot latency.' },
        { name: '=encradant', value: 'Learn about the bot.' },
        { name: '=nick @user <nickname>', value: 'Change a user\'s nickname (requires permissions).' },
        { name: '=help', value: 'Show this help message.' },
      ],
      footer: { text: 'Noir Mirage Enterprise' },
    };
    return message.reply({ embeds: [helpEmbed] });
  }

  if (command === 'nick') {
    if (!message.guild) return message.reply('This command can only be used in a server.');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('Please mention a user to rename. Usage: `=nick @user <new nickname>`');

    const mentionRegex = new RegExp(`^<@!?${targetUser.id}>`);
    const nickname = message.content
      .slice(prefix.length)
      .trim()
      .replace(/^nick\s+/i, '')
      .replace(mentionRegex, '')
      .trim();

    if (!nickname) return message.reply('Please provide a new nickname. Usage: `=nick @user <new nickname>`');

    const executorMember = message.member;
    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return message.reply('Could not find that user in this server.');

    const check = canChangeNickname(executorMember, targetMember);
    if (!check.allowed) {
      return message.reply({ content: check.reason, allowedMentions: { repliedUser: true } });
    }

    try {
      await targetMember.setNickname(nickname);
      return message.reply(`Successfully changed ${targetUser.tag}'s nickname to **${nickname}**.`);
    } catch (err) {
      console.error('[Nick] Error setting nickname:', err);
      return message.reply('I was unable to change that user\'s nickname. Please check my permissions.');
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'nick') return;

  if (!interaction.guild) {
    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('user');
  const nickname = interaction.options.getString('nickname');

  const executorMember = interaction.member;
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ content: 'Could not find that user in this server.', ephemeral: true });
  }

  const check = canChangeNickname(executorMember, targetMember);
  if (!check.allowed) {
    return interaction.reply({ content: check.reason, ephemeral: true });
  }

  try {
    await targetMember.setNickname(nickname);
    return interaction.reply(`Successfully changed ${targetUser.tag}'s nickname to **${nickname}**.`);
  } catch (err) {
    console.error('[Nick] Error setting nickname via slash command:', err);
    return interaction.reply({ content: 'I was unable to change that user\'s nickname. Please check my permissions.', ephemeral: true });
  }
});

// Login using the TOKEN environment variable
client.login(process.env.TOKEN).catch((err) => {
  console.error('[Discord] Failed to login:', err.message);
  process.exit(1);
});

