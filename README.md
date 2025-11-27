# MagangHub Stand-up Bot

Telegram bot that posts a structured daily stand-up reminder into any group/topic you configure. Designed for MagangHub, but you can drop it into any team chat as long as you supply the group and topic IDs.

## What It Does

- Sends a Markdown-formatted stand-up template to the configured topic every day at the time you choose, automatically appending the current date and the configured reminder time (WIB) so teammates know when it was triggered.
- Message content asks teammates to share: (1) what they did yesterday, (2) what they will do today, and (3) blockers. It includes inline buttons for quick acknowledgments if you extend the bot further.
- Keeps running as a lightweight Node.js process (no database required).
- Lets anyone reuse it in their own Telegram group by providing their own `.env` values.

## Requirements

- Node.js 18+
- Telegram bot token (create via [@BotFather](https://t.me/BotFather))
- Chat/topic IDs for the destination group thread

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file based on the following template:

   ```bash
   BOT_TOKEN=123456:ABCDEF        # BotFather token
   CHAT_ID=-1001234567890         # Target group/channel ID
   THREAD_ID=42                   # Topic ID inside the group
   DEFAULT_TIME=09:00             # Daily reminder time (HH:MM, WIB)
   ```

   - `CHAT_ID` can be obtained by adding the bot to the group and using `getUpdates` or a helper bot like `@RawDataBot`.
   - `THREAD_ID` is the message thread/topic ID, available via Telegram clients that support topics or the REST `getUpdates` payload.
   - `DEFAULT_TIME` controls when the cron job runs (Asia/Jakarta timezone).
   - Message text lives in `message.json`. Edit the `message` value there to change the default reminder (Markdown supported).

3. Start the bot:

   ```bash
   node index.js
   ```

   The process schedules the daily reminder and listens for commands. Keep it running (e.g., via PM2, systemd, Docker, etc.).

## Commands

- `/test` &mdash; send the stand-up message immediately (for quick verification).

### Customizing the message

- Set `STANDUP_MESSAGE` in `.env` to override the Markdown text. Use literal `\n` for new lines (converted at runtime) or populate the variable with HEREDOC syntax when creating the `.env` file.

### Customizing the message

- Edit `message.json` to change the default Markdown message. The bot reloads it at startup.
- Optionally set `STANDUP_MESSAGE` in `.env` to override the JSON text at runtime. Use literal `\n` for new lines (converted when the bot starts) or populate the env variable via HEREDOC when generating `.env`.

Extend the bot by adding more commands or handlers inside `index.js` if needed.
