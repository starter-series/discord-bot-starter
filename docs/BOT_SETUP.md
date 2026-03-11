# Discord Bot Setup

Step-by-step guide to create a Discord bot and invite it to your server.

## 1. Create Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Enter a name and click **Create**
4. Copy the **Application ID** → this is your `DISCORD_CLIENT_ID`

## 2. Create Bot

1. Go to the **Bot** tab in the left sidebar
2. Click **Reset Token** (or **Add Bot** if creating for the first time)
3. Copy the token → this is your `DISCORD_TOKEN`

> **Keep your token secret.** Never commit it to git. Use `.env` or GitHub Secrets.

## 3. Configure Intents

Under **Privileged Gateway Intents**, enable what you need:

| Intent | When to enable |
|--------|---------------|
| Presence Intent | If your bot reads user online/offline status |
| Server Members Intent | If your bot reads the member list or member events |
| Message Content Intent | If your bot reads message text (not needed for slash commands) |

This starter only uses slash commands, so **no privileged intents are required** by default.

## 4. Invite Bot to Server

1. Go to the **OAuth2** tab
2. Under **OAuth2 URL Generator**, select scopes:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, select what your bot needs:
   - For this starter: `Send Messages`, `Embed Links`
4. Copy the generated URL and open it in your browser
5. Select your server and click **Authorize**

## 5. Get Guild ID (for development)

For faster command registration during development:

1. Enable **Developer Mode** in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server name → **Copy Server ID**
3. Set this as `DISCORD_GUILD_ID` in your `.env`

Guild-scoped commands register instantly. Global commands take up to 1 hour.

## 6. Register Commands

```bash
npm run deploy-commands
```

You should see your slash commands appear when you type `/` in your server.

## Troubleshooting

### Commands not showing up
- Make sure the bot has `applications.commands` scope
- Guild commands: check `DISCORD_GUILD_ID` is correct
- Global commands: wait up to 1 hour

### "Missing Access" error
- Re-invite the bot with the correct permissions
- Check the channel-level permissions

### "Used disallowed intents" error
- Enable the required intents in the Developer Portal (Step 3)
