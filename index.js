require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = Number(process.env.CHAT_ID);
const THREAD_ID = Number(process.env.THREAD_ID);
const DEFAULT_TIME = process.env.DEFAULT_TIME || '09:00';
const defaultStandupTemplate = `
🔥 *Daily Stand-Up Reminder*

1. *What you did yesterday?*  
2. *What you will do today?*  
3. *Any blockers?*  

Silakan update di thread ini ya 👇
`;
let jsonMessage = null;
try {
  const messageConfig = require('./message.json');
  if (messageConfig) {
    jsonMessage = messageConfig.message || messageConfig.text || null;
  }
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    console.warn('Failed to load message.json:', err.message);
  }
}

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not defined. Set it in your .env file.');
}

if (!Number.isFinite(CHAT_ID)) {
  throw new Error(
    'CHAT_ID is missing or invalid. It must be a numeric chat ID.'
  );
}

if (!Number.isFinite(THREAD_ID)) {
  throw new Error(
    'THREAD_ID is missing or invalid. It must be a numeric topic ID.'
  );
}

function parseStandupTime(timeStr) {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(timeStr);
  if (!match) {
    throw new Error(
      `DEFAULT_TIME must use HH:MM 24h format. Received "${timeStr}"`
    );
  }

  const [, hours, minutes] = match;
  return {
    cron: `${Number(minutes)} ${Number(hours)} * * *`,
    label: `${hours}:${minutes}`,
  };
}

const { cron: standupCron, label: standupTimeLabel } =
  parseStandupTime(DEFAULT_TIME);

const bot = new Telegraf(BOT_TOKEN);

// Stand-up Message Template (customizable via JSON/env)
const envMessage = process.env.STANDUP_MESSAGE;
const standupMessage =
  (envMessage ? envMessage.replace(/\\n/g, '\n') : jsonMessage) ||
  defaultStandupTemplate;

function formatTimestamp() {
  const date = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
  return `${date} ${standupTimeLabel}`;
}

function buildMessage() {
  return `🕒 ${formatTimestamp()} WIB\n\n${standupMessage}`;
}

// Schedule — default setiap hari jam DEFAULT_TIME (WIB)
cron.schedule(
  standupCron,
  () => {
    bot.telegram.sendMessage(CHAT_ID, buildMessage(), {
      message_thread_id: THREAD_ID, // KIRIM KE TOPIC tertentu!
      parse_mode: 'Markdown',
    });
    console.log('Stand-up message sent!');
  },
  {
    timezone: 'Asia/Jakarta',
  }
);

// Start bot
bot
  .launch()
  .then(() => console.log('Bot running…'))
  .catch((err) => console.error('Launch error:', err));
console.log('Bot is running...');

bot.command('test', (ctx) => {
  ctx.telegram.sendMessage(CHAT_ID, buildMessage(), {
    message_thread_id: THREAD_ID,
    parse_mode: 'Markdown',
  });
});
