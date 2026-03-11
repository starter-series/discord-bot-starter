# Deploy to Railway

## 1. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub Repo**
3. Select your repository
4. Railway will auto-detect the Dockerfile

## 2. Set Environment Variables

In your Railway service dashboard:

1. Go to the **Variables** tab
2. Add your variables:
   - `DISCORD_TOKEN` = your bot token
   - `DISCORD_CLIENT_ID` = your application ID

## 3. Configure as Worker

Discord bots don't serve HTTP. To avoid health check failures:

1. Go to **Settings** tab
2. Under **Networking**, remove the port (or don't generate a domain)

Railway charges based on usage. A Discord bot typically uses ~$1-3/month on the Hobby plan.

## 4. Set Up GitHub Actions Deployment

For automated deployments via the CD workflow:

### Get Railway Token

1. Go to [railway.app/account/tokens](https://railway.app/account/tokens)
2. Click **Create Token**
3. Copy the token

### Get Service ID

1. Open your Railway project
2. Click on your service
3. Go to **Settings** → the Service ID is in the URL or settings page

### Add GitHub Secrets

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions**:

- `RAILWAY_TOKEN` = the token from step above
- `RAILWAY_SERVICE_ID` = the service ID

## 5. Deploy

Go to **Actions** → **Deploy to Railway** → **Run workflow**

The workflow will deploy and create a GitHub Release automatically.

## Troubleshooting

### Bot goes offline after a while
- Make sure the service is set to **Worker** type, not **Web**
- Check the Railway logs for errors

### "No railway.toml or Dockerfile found"
- Make sure the Dockerfile is in the repository root
