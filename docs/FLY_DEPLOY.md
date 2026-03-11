# Deploy to Fly.io

## 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux / WSL
curl -L https://fly.io/install.sh | sh
```

Sign up or log in:

```bash
fly auth signup
# or
fly auth login
```

## 2. Create Fly App

```bash
cp fly.toml.example fly.toml
```

Edit `fly.toml` and set your app name:

```toml
app = "my-discord-bot"
```

Then launch:

```bash
fly launch --no-deploy
```

> Select **No** when asked about a database or Redis. Discord bots don't need them by default.

## 3. Set Secrets

```bash
fly secrets set DISCORD_TOKEN=your-bot-token DISCORD_CLIENT_ID=your-app-id
```

## 4. Scale to 1 Machine

Discord bots are worker processes. You only need one instance:

```bash
fly scale count 1
```

Fly.io free tier includes enough resources for a Discord bot.

## 5. Deploy

Manual deploy from your machine:

```bash
fly deploy
```

## 6. Set Up GitHub Actions Deployment

For automated deployments via the CD workflow:

### Get Fly API Token

```bash
fly tokens create deploy -x 999999h
```

### Add GitHub Secret

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions**:

- `FLY_API_TOKEN` = the token from above

### Deploy via Actions

Go to **Actions** → **Deploy to Fly.io** → **Run workflow**

The workflow will deploy and create a GitHub Release automatically.

## Troubleshooting

### "No machines in app"
- Run `fly scale count 1` to create a machine

### Bot goes offline
- Check logs: `fly logs`
- Make sure `fly.toml` does NOT have a `[[services]]` section (bots are workers, not web servers)

### "Out of memory"
- Scale up: `fly scale vm shared-cpu-1x --memory 512`
