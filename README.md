<div align="center">

# Discord Bot Starter

**Discord.js + Docker + GitHub Actions CI/CD + one-click deploy.**

Build your bot. Push to deploy.

[![CI](https://github.com/heznpc/discord-bot-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/heznpc/discord-bot-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://www.docker.com/)

**English** | [한국어](README.ko.md)

</div>

---

## Quick Start

```bash
# 1. Click "Use this template" on GitHub (or clone)
git clone https://github.com/heznpc/discord-bot-starter.git my-bot
cd my-bot

# 2. Install dependencies
npm install

# 3. Set up environment (see docs/DISCORD_SETUP.md for detailed guide)
cp .env.example .env
# Edit .env → add DISCORD_TOKEN and DISCORD_CLIENT_ID

# 4. Register slash commands
npm run deploy-commands

# 5. Start the bot
npm run dev
```

## What's Included

```
├── src/
│   ├── index.js                  # Entry point
│   ├── config.js                 # Environment config loader
│   ├── commands/                 # Slash commands (auto-loaded)
│   │   ├── ping.js               # /ping — check latency
│   │   └── help.js               # /help — list commands
│   └── events/                   # Event handlers (auto-loaded)
│       ├── ready.js              # Bot ready
│       └── interactionCreate.js  # Command router
├── scripts/
│   ├── deploy-commands.js        # Register commands with Discord API
│   └── bump-version.js           # Bump package.json version
├── tests/
│   └── commands.test.js          # Structure validation tests
├── Dockerfile                    # Production container
├── docker-compose.yml            # Dev with hot reload
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # Lint, test, Docker build
│   │   ├── cd-railway.yml        # Deploy to Railway
│   │   ├── cd-fly.yml            # Deploy to Fly.io
│   │   └── setup.yml             # Auto setup checklist on first use
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── DISCORD_SETUP.md          # Discord Developer Portal guide
│   └── DEPLOY_GUIDE.md           # Railway & Fly.io deployment guide
└── package.json
```

## Features

- **Discord.js v14** — Slash commands, embeds, auto-loaded command/event handlers
- **CI Pipeline** — Security audit, lint, test, Docker build verification on every push
- **CD Pipeline** — One-click deploy to Railway or Fly.io + auto GitHub Release
- **Docker** — Production Dockerfile + dev compose with hot reload
- **Version management** — `npm run version:patch/minor/major` to bump `package.json`
- **Dev mode** — `npm run dev` for live reload with `node --watch`
- **Starter code** — `/ping` + `/help` commands, modular event handlers
- **Deploy guides** — Step-by-step docs for Discord, Railway, and Fly.io setup
- **Template setup** — Auto-creates setup checklist issue on first use

## CI/CD

### CI (every PR + push to main)

| Step | What it does |
|------|-------------|
| Security audit | `npm audit` for dependency vulnerabilities |
| Lint | ESLint for code quality |
| Test | Jest (passes with no tests by default) |
| Docker build | Builds the container image to catch build errors |

### CD (manual trigger via Actions tab)

| Step | What it does |
|------|-------------|
| Version guard | Fails if git tag already exists for this version |
| Deploy | Pushes to Railway or Fly.io |
| GitHub Release | Creates a tagged release with auto-generated notes |

**How to deploy:**

1. Set up GitHub Secrets (see below)
2. Bump version: `npm run version:patch` (or `version:minor` / `version:major`)
3. Go to **Actions** tab → **Deploy to Railway** (or **Fly.io**) → **Run workflow**

### GitHub Secrets

#### Railway (`cd-railway.yml`)

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway API token |
| `RAILWAY_SERVICE_ID` | Target service ID |

See **[docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)** for setup guide.

#### Fly.io (`cd-fly.yml`)

| Secret | Description |
|--------|-------------|
| `FLY_API_TOKEN` | Fly.io deploy token |

See **[docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)** for setup guide.

## Development

```bash
# Start with hot reload
npm run dev

# Or use Docker
docker compose up

# Register slash commands with Discord
npm run deploy-commands

# Bump version (updates package.json)
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0

# Lint & test
npm run lint
npm test
```

## Adding Commands

Create a new file in `src/commands/`:

```js
// src/commands/echo.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Repeat your message')
    .addStringOption(option =>
      option.setName('text').setDescription('Text to repeat').setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('text');
    await interaction.reply(text);
  },
};
```

Then register: `npm run deploy-commands`

Commands are auto-loaded — no need to edit any other file.

## Why This Over Sapphire / Akairo?

[Sapphire](https://github.com/sapphiredev/framework) (700+ stars) and [Akairo](https://github.com/discord-akairo/discord-akairo) (600+ stars) are Discord bot **frameworks** that add structure on top of discord.js. This template takes a different approach:

|  | This template | Sapphire / Akairo |
|---|---|---|
| Philosophy | Thin starter with CI/CD | Full framework with runtime |
| Abstraction | Vanilla discord.js | Framework-specific patterns |
| Learning curve | Read the discord.js docs | Learn the framework's API |
| CI/CD | Full pipeline included | Not included |
| Docker | Production-ready | Not included |
| Dependencies | 2 runtime (discord.js, dotenv) | 20+ |
| AI/vibe-coding | LLMs generate clean vanilla JS | LLMs must learn framework conventions |
| Best for | Utility bots, simple commands | Large bots with complex plugin systems |

**Choose this template if:**
- You want to understand what your bot actually does, line by line
- You need production CI/CD + Docker out of the box (no other template provides this)
- You're using AI tools to generate bot code — vanilla discord.js produces the cleanest AI output
- Your bot has slash commands, not a plugin architecture

**Choose Sapphire/Akairo if:**
- You need a built-in command parsing and preconditions system
- You want plugin architecture for a large, multi-module bot
- You need framework-level features like argument types and inhibitors

### What about TypeScript?

This template uses JavaScript for simplicity. To add TypeScript:

1. Add `typescript` and `@types/node` to devDependencies
2. Add a `tsconfig.json`
3. Update `npm start` to build and run from `dist/`
4. Rename `.js` files to `.ts`

TypeScript is opt-in, not forced. For many bots (utility commands, simple automation), JavaScript is all you need.

## Contributing

PRs welcome. Please use the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## License

[MIT](LICENSE)
