# Discord Bot Setup

Step-by-step guide to create a Discord bot and configure it for this project.

---

## 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Sign in with your Discord account
3. Click **New Application**
4. Enter a name (e.g., `My Bot`) and click **Create**
5. Note the **Application ID** — this is your `DISCORD_CLIENT_ID`

## 2. Create a Bot User

1. In your application, go to the **Bot** section (left sidebar)
2. Click **Add Bot** > **Yes, do it!**
3. Under **Token**, click **Reset Token** > **Yes, do it!**
4. Copy the token — this is your `DISCORD_TOKEN`

> **Important:** Never share your bot token. If it leaks, reset it immediately on this page.

## 3. Configure Bot Settings

On the **Bot** page, configure these settings:

| Setting | Recommended | Why |
|---------|-------------|-----|
| Public Bot | Off | Prevents others from adding your bot |
| Requires OAuth2 Code Grant | Off | Not needed for bot tokens |
| Presence Intent | Off | Enable only if your bot tracks user presence |
| Server Members Intent | Off | Enable only if your bot needs the member list |
| Message Content Intent | Off | Enable only if your bot reads message content (not needed for slash commands) |

> **Privileged Intents:** If you enable Presence, Server Members, or Message Content intents, you must also enable them in your bot code. This template uses slash commands, so none of these are required by default.

## 4. Invite the Bot to Your Server

1. Go to the **OAuth2** section > **URL Generator**
2. Under **Scopes**, select:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, select the permissions your bot needs:
   - For this starter: `Send Messages`, `Embed Links`, `Use Slash Commands`
4. Copy the generated URL at the bottom
5. Open the URL in your browser and select your server
6. Click **Authorize**

## 5. Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in the values:
   ```bash
   DISCORD_TOKEN=your-bot-token-from-step-2
   DISCORD_CLIENT_ID=your-application-id-from-step-1
   ```

3. (Optional) For development, add your dev server ID for instant command registration:
   ```bash
   DISCORD_GUILD_ID=your-dev-server-id
   ```

   > To get a server ID: Enable Developer Mode in Discord settings > right-click your server > Copy Server ID.

## 6. Register Slash Commands

```bash
npm run deploy-commands
```

This registers your commands with the Discord API. Commands are registered:
- **Globally** if `DISCORD_GUILD_ID` is not set (takes up to 1 hour to propagate)
- **Per-guild** if `DISCORD_GUILD_ID` is set (instant, recommended for development)

## 7. Start the Bot

```bash
npm run dev
```

You should see a message like `Logged in as My Bot#1234` in the console.

## 8. Add GitHub Secrets (for CD)

If you plan to deploy with the CD pipeline, add these secrets to your GitHub repository:

Go to your repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Secret | Value | Where to find it |
|--------|-------|-------------------|
| `DISCORD_TOKEN` | Bot token | Developer Portal > Bot > Token |
| `DISCORD_CLIENT_ID` | Application ID | Developer Portal > General Information |

> These are used by the deployment platforms (Railway / Fly.io) as environment variables, not by the GitHub Actions workflow directly. See [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) or [FLY_DEPLOY.md](FLY_DEPLOY.md) for deployment-specific setup.

---

## Troubleshooting

### "An invalid token was provided"

- Make sure you copied the full bot token (it is a long string)
- If you reset the token, update your `.env` file with the new one
- Verify there are no extra spaces or quotes around the token in `.env`

### Commands not showing up in Discord

- Run `npm run deploy-commands` to register commands
- Global commands can take up to 1 hour to appear — use `DISCORD_GUILD_ID` for instant registration during development
- Make sure the bot was invited with the `applications.commands` scope (Step 4)

### "Missing Access" or "Missing Permissions" error

- Re-invite the bot with the correct permissions (Step 4)
- Check that the bot's role has the required permissions in your server's role settings
- Some channels may have permission overrides that block the bot

### Bot is online but not responding

- Check that you registered commands with `npm run deploy-commands`
- Look at the console for error messages
- Verify the bot has the `Send Messages` permission in the channel

### "Privileged intent" error

- If your code uses privileged intents (Presence, Server Members, Message Content), enable them on the **Bot** page in the Developer Portal (Step 3)
- This starter uses slash commands only and does not require any privileged intents by default
