require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = Number(process.env.CHAT_ID);
const THREAD_ID = Number(process.env.THREAD_ID);
const DEFAULT_TIME = process.env.DEFAULT_TIME || '09:00';

const HOLIDAYS = {
  2025: {
    nationalHolidays: [
      '01-01', // Tahun Baru Masehi
      '01-29', // Isra Mi'raj Nabi Muhammad SAW
      '01-30', // Tahun Baru Imlek
      '03-29', // Hari Raya Nyepi
      '03-31', // Idul Fitri 1446 H
      '04-01', // Idul Fitri 1446 H
      '04-18', // Wafat Yesus Kristus
      '05-01', // Hari Buruh Internasional
      '05-12', // Hari Raya Waisak
      '05-29', // Kenaikan Yesus Kristus
      '06-01', // Hari Lahir Pancasila
      '06-07', // Idul Adha 1446 H
      '06-27', // Tahun Baru Islam 1447 H
      '08-17', // Hari Kemerdekaan RI
      '09-05', // Maulid Nabi Muhammad SAW
      '12-25', // Hari Raya Natal
    ],
    collectiveLeave: [
      '04-02', // Cuti Bersama Idul Fitri
      '04-03', // Cuti Bersama Idul Fitri
      '04-04', // Cuti Bersama Idul Fitri
      '04-07', // Cuti Bersama Idul Fitri
      '12-26', // Cuti Bersama Natal
    ],
  },
  2026: {
    nationalHolidays: [
      '01-01', // Tahun Baru Masehi
      '01-16', // Isra Mi'raj Nabi Muhammad SAW
      '02-17', // Tahun Baru Imlek
      '03-19', // Hari Raya Nyepi
      '03-21', // Idul Fitri 1447 H
      '03-22', // Idul Fitri 1447 H
      '04-03', // Wafat Yesus Kristus
      '04-05', // Kebangkitan Yesus Kristus (Pascah)
      '05-01', // Hari Buruh Internasional / Hari Raya Waisak
      '05-14', // Kenaikan Yesus Kristus
      '05-27', // Idul Adha 1447 H
      '05-31', // Hari Raya Waisak
      '06-01', // Hari Lahir Pancasila
      '06-16', // Tahun Baru Islam 1448 H
      '08-17', // Hari Kemerdekaan RI
      '08-25', // Maulid Nabi Muhammad SAW
      '12-25', // Hari Raya Natal
    ],
    collectiveLeave: [
      '01-16', // Cuti Bersama Imlek
      '03-18', // Cuti Bersama Nyepi
      '03-20', // Cuti Bersama Idul Fitri
      '03-23', // Cuti Bersama Idul Fitri
      '03-24', // Cuti Bersama Idul Fitri
      '05-15', // Cuti Bersama Kenaikan Yesus Kristus
      '05-28', // Cuti Bersama Hari Raya Idul Adha
      '12-24', // Cuti Bersama Kelahiran Yesus Kristus
    ],
  },
};

function isHolidayOrWeekend() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Minggu, 6 = Sabtu

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const monthDay = `${month}-${day}`;

  const yearHolidays = HOLIDAYS[year];
  if (!yearHolidays) {
    return false;
  }

  if (yearHolidays.nationalHolidays.includes(monthDay)) {
    return true;
  }

  if (yearHolidays.collectiveLeave.includes(monthDay)) {
    return true;
  }

  return false;
}
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

cron.schedule(
  standupCron,
  () => {
    if (isHolidayOrWeekend()) {
      console.log('Hari ini weekend atau libur nasional, pesan tidak dikirim.');
      return;
    }

    bot.telegram.sendMessage(CHAT_ID, buildMessage(), {
      message_thread_id: THREAD_ID,
      parse_mode: 'Markdown',
    });
    console.log('Stand-up message sent!');
  },
  {
    timezone: 'Asia/Jakarta',
  }
);

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
