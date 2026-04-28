require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// --- Express Keep-Alive Server (for UptimeRobot) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('NME Encradant is online.');
});

app.listen(PORT, () => {
  console.log(`[Server] Keep-alive web server running on port ${PORT}`);
});

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

