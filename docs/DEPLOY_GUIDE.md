# Deployment Guide

Step-by-step guide to deploy your Discord bot to Railway or Fly.io.

---

## Option A: Deploy to Railway

### 1. Create a Railway Account

1. Go to [railway.app](https://railway.app/) and sign up
2. Connect your GitHub account

### 2. Create a New Project

1. Click **New Project** > **Deploy from GitHub repo**
2. Select your bot repository
3. Railway will auto-detect the `Dockerfile` and start building

### 3. Set Environment Variables

In the Railway dashboard, go to your service > **Variables** and add:

| Variable | Value | Required |
|----------|-------|----------|
| `DISCORD_TOKEN` | Your bot token | Yes |
| `DISCORD_CLIENT_ID` | Your application ID | Yes |

> Do not add `DISCORD_GUILD_ID` in production — you want commands registered globally.

### 4. Get Railway API Credentials

1. Go to [railway.app/account/tokens](https://railway.app/account/tokens)
2. Click **Create Token**
3. Name it `github-deploy` and copy the token

To get your Service ID:
1. Open your project in Railway dashboard
2. Click on your service
3. Go to **Settings**
4. Copy the **Service ID** (or find it in the URL)

### 5. Add GitHub Secrets

Go to your GitHub repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Secret | Value | Where to find it |
|--------|-------|-------------------|
| `RAILWAY_TOKEN` | API token | Railway > Account > Tokens |
| `RAILWAY_SERVICE_ID` | Service ID | Railway > Service > Settings |

### 6. Deploy

1. Bump version: `npm run version:patch`
2. Commit and push
3. Go to **Actions** tab > **Deploy to Railway** > **Run workflow**

The workflow runs CI first, then deploys to Railway and creates a GitHub Release.

---

## Option B: Deploy to Fly.io

### 1. Create a Fly.io Account

1. Go to [fly.io](https://fly.io/) and sign up
2. Install the Fly CLI:
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh

   # Windows
   powershell -Command "irm https://fly.io/install.ps1 | iex"
   ```
3. Log in:
   ```bash
   flyctl auth login
   ```

### 2. Launch Your App

From your project directory:

```bash
flyctl launch
```

This will:
- Detect your `Dockerfile`
- Create a `fly.toml` configuration file
- Create the app on Fly.io

When prompted:
- Choose a region close to your users (or Discord's servers)
- Say **No** to PostgreSQL and Redis (unless you need them)
- Say **No** to deploy now (we will set secrets first)

### 3. Set Environment Variables

```bash
flyctl secrets set DISCORD_TOKEN=your-bot-token DISCORD_CLIENT_ID=your-application-id
```

> Secrets are encrypted and not visible after setting. Use `flyctl secrets list` to see which secrets are set.

### 4. Get Fly.io API Token

```bash
flyctl tokens create deploy -x 999999h
```

Copy the token output.

### 5. Add GitHub Secrets

Go to your GitHub repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Secret | Value | Where to find it |
|--------|-------|-------------------|
| `FLY_API_TOKEN` | Deploy token | `flyctl tokens create deploy` output |

### 6. Deploy

1. Bump version: `npm run version:patch`
2. Commit and push
3. Go to **Actions** tab > **Deploy to Fly.io** > **Run workflow**

The workflow runs CI first, then deploys to Fly.io and creates a GitHub Release.

---

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | Yes | — |
| `DISCORD_CLIENT_ID` | Application ID from Discord Developer Portal | Yes | — |
| `DISCORD_GUILD_ID` | Server ID for guild-scoped commands | No (dev only) | — |

---

## Scaling

### Railway

- Railway auto-scales based on your plan
- Free tier: 500 hours/month, 512 MB RAM
- Pro tier ($5/month): unlimited hours, configurable resources
- Monitor usage in the Railway dashboard under **Metrics**

### Fly.io

- Scale with the CLI:
  ```bash
  # Scale memory
  flyctl scale memory 512

  # Scale VM count (for high availability)
  flyctl scale count 2

  # View current scale
  flyctl scale show
  ```
- Free tier: 3 shared-cpu VMs, 256 MB RAM each
- Monitor with `flyctl status` and `flyctl logs`

---

## Troubleshooting

### Bot deploys but goes offline

- Check logs: `flyctl logs` (Fly.io) or Railway dashboard > **Logs**
- Verify environment variables are set correctly
- Make sure `DISCORD_TOKEN` is valid — reset it in the Developer Portal if needed

### "No Dockerfile found" error

- Make sure `Dockerfile` is in the root of your repository
- Check that it is committed to git (not in `.gitignore`)

### Railway deploy fails with "service not found"

- Verify `RAILWAY_SERVICE_ID` matches your service
- Make sure the Railway token has access to the project

### Fly.io deploy fails with "app not found"

- Run `flyctl launch` first to create the app
- Make sure `fly.toml` is committed to git
- Verify the app name in `fly.toml` matches your Fly.io app

### Bot starts but commands don't work

- Register commands in production: run `npm run deploy-commands` locally with `DISCORD_GUILD_ID` unset
- Global commands take up to 1 hour to propagate
- Check bot permissions in your Discord server

### Container crashes with out-of-memory

- Increase memory: `flyctl scale memory 512` (Fly.io) or upgrade plan (Railway)
- Check for memory leaks in your bot code
- Discord.js bots typically need 128-256 MB RAM
