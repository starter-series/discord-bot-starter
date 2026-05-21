<div align="center">

# Discord Bot Starter

**Discord.js + Docker + GitHub Actions CI/CD + one-click deploy.**

Build your bot. Push to deploy.

[![CI](https://github.com/starter-series/discord-bot-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/starter-series/discord-bot-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://www.docker.com/)

**English** | [한국어](README.ko.md)

</div>

---

> **Part of [Starter Series](https://github.com/starter-series/starter-series)** — Stop explaining CI/CD to your AI every time. Clone and start.
>
> [Docker Deploy](https://github.com/starter-series/docker-deploy-starter) · **Discord Bot** · [Telegram Bot](https://github.com/starter-series/telegram-bot-starter) · [Browser Extension](https://github.com/starter-series/browser-extension-starter) · [Electron App](https://github.com/starter-series/electron-app-starter) · [npm Package](https://github.com/starter-series/npm-package-starter) · [React Native](https://github.com/starter-series/react-native-starter) · [VS Code Extension](https://github.com/starter-series/vscode-extension-starter) · [MCP Server](https://github.com/starter-series/mcp-server-starter) · [Python MCP Server](https://github.com/starter-series/python-mcp-server-starter) · [Cloudflare Pages](https://github.com/starter-series/cloudflare-pages-starter)

---

## Quick Start

**Via [create-starter](https://github.com/starter-series/create-starter)** (recommended):

```bash
npx @starter-series/create my-discord-bot --template discord-bot
cd my-discord-bot && npm install
cp .env.example .env  # fill in DISCORD_TOKEN + DISCORD_CLIENT_ID
npm run deploy-commands
npm run dev
```

**Or clone directly:**

```bash
git clone https://github.com/starter-series/discord-bot-starter my-discord-bot
cd my-discord-bot && npm install
cp .env.example .env
npm run deploy-commands
npm run dev
```

See [docs/DISCORD_SETUP.md](docs/DISCORD_SETUP.md) for the Discord Developer Portal walkthrough.

## What's Included

```
├── src/
│   ├── index.js                  # Entry point
│   ├── config.js                 # Environment config loader
│   ├── commands/                 # Slash commands (auto-loaded)
│   │   ├── index.js              # Loader
│   │   ├── ping.js               # /ping — check latency
│   │   ├── help.js               # /help — list commands
│   │   └── search.js             # /search — autocomplete example
│   ├── events/                   # Event handlers (auto-loaded)
│   │   ├── ready.js              # Bot ready
│   │   ├── interactionCreate.js  # Command router
│   │   ├── error.js              # Client error logger
│   │   └── warn.js               # Client warn logger
│   └── lib/
│       ├── health.js             # HTTP health server
│       ├── logger.js             # Structured logger
│       ├── rate-limiter.js       # Per-user / per-command token bucket
│       └── safe-interaction.js   # safeRespond() — reply/editReply/followUp wrapper that never throws
├── scripts/
│   ├── deploy-commands.js        # Register commands with Discord API
│   └── bump-version.js           # Bump package.json version
├── tests/                        # Jest — 27 tests, coverage gated at 70 % statements
├── Dockerfile                    # Production container
├── docker-compose.yml            # Dev with hot reload
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # Lint, test, Docker build, Trivy scan
│   │   ├── codeql.yml            # CodeQL static analysis
│   │   ├── cd-railway.yml        # Deploy to Railway (action pinned by SHA)
│   │   ├── cd-fly.yml            # Deploy to Fly.io
│   │   ├── maintenance.yml       # Weekly CI health check
│   │   ├── stale.yml             # Stale issue/PR sweep
│   │   └── setup.yml             # First-use setup checklist
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── DISCORD_SETUP.md          # Discord Developer Portal guide
│   └── DEPLOY_GUIDE.md           # Railway & Fly.io deployment guide
└── package.json
```

## Currently implemented

Things that exist in this repo today, backed by code on disk.

- **Discord.js v14** — slash commands, embeds, auto-loaded command/event handlers.
- **Starter code** — `/ping`, `/help`, `/search` (autocomplete pattern); `ready`, `interactionCreate`, `error`, `warn` events.
- **Runtime safety**
  - `src/lib/safe-interaction.js` — `safeRespond(interaction, payload)` picks the right method (`reply` / `editReply` / `followUp`) based on the interaction state, and swallows Discord API errors (expired interactions, double-ack, unknown message) instead of crashing the process.
  - `src/lib/rate-limiter.js` — fixed-window per-key limiter. Global default is 5 invocations per user per 60 s; individual commands override that by exporting `rateLimit: { window, max }`.
  - `src/lib/health.js` — HTTP `/health` endpoint at `HEALTH_PORT` (default `3000`), wired into `Dockerfile` `HEALTHCHECK`.
- **Supply-chain hardening**
  - `npm ci --ignore-scripts` everywhere — CI workflows, Railway CLI install, **and the production Docker build**. No install-time arbitrary code from transitive deps.
  - `package-lock.json` committed and required by `npm ci`.
  - All third-party GitHub Actions pinned by **commit SHA**, not a floating tag (`softprops/action-gh-release`, `superfly/flyctl-actions/setup-flyctl`, `aquasecurity/trivy-action`). Bumps land via Dependabot only.
  - `gitleaks` pinned to `8.30.1` with sha256 checksum verification.
  - GitHub Secret Scanning + Push Protection + Dependabot security updates enabled at the repo level (push-time block, not just post-hoc scan).
- **Runtime crash handling**
  - `process.on('uncaughtException')` and `process.on('unhandledRejection')` route through the structured logger before exit — orchestrators get a stack, not silent death.
  - SIGINT/SIGTERM trigger graceful shutdown of the gateway client and health server.
  - `--enable-source-maps` on `npm start` / `npm dev` for legible stack traces.
- **CI pipeline** (every PR + push to main) — `npm audit`, ESLint, Jest with `--coverage` (statements / branches / functions / lines all gated), Docker build, Trivy CRITICAL/HIGH scan.
- **CodeQL** — static analysis on push/PR and weekly.
- **CD pipelines** — one-shot Railway or Fly.io deploy + auto GitHub Release; manual trigger from the Actions tab.
- **Docker** — production `Dockerfile` + `docker-compose.yml` for hot-reload dev.
- **Version management** — `npm run version:patch/minor/major` with a git-tag duplicate guard in CD.
- **Maintenance automation** — weekly CI health check, stale issue/PR sweep, first-use setup checklist.
- **Bilingual README** — English + Korean.

## Planned

No active roadmap items. The template is in steady-state maintenance; security patches and Discord.js majors are applied via Dependabot. Open an issue if you have a concrete addition in mind.

## Design intent

*Why* this template is shaped the way it is.

**Thin starter, not a framework.** [Sapphire](https://github.com/sapphiredev/framework) and [Akairo](https://github.com/discord-akairo/discord-akairo) add structure on top of discord.js. This template deliberately does not. The value sits in CI/CD, Docker, the supply-chain posture, and the runtime-safety lib — not in a custom command dispatcher.

|  | This template | Sapphire / Akairo |
|---|---|---|
| Philosophy | Thin starter + CI/CD + Docker | Full framework with runtime |
| Abstraction | Vanilla discord.js | Framework-specific patterns |
| CI/CD | Full pipeline included | Not included |
| Docker | Production-ready | Not included |
| Runtime deps | 2 (discord.js, dotenv) | 20+ |
| AI/vibe-coding | LLMs generate clean vanilla JS | LLMs must learn framework conventions |
| Best for | Utility bots, simple commands | Large bots with complex plugin systems |

**Safety lives in `src/lib/`, not in the command files.** Rate limiting and Discord-API error swallowing are imported helpers, not framework magic. Each command is one file you can read top-to-bottom in 30 seconds.

**Supply-chain posture is the differentiator.** `--ignore-scripts`, pinned actions, lockfile-enforced installs, and gitleaks checksum-verification are the kind of thing every Discord bot template should have — and most don't. That is the reason this starter exists.

**JavaScript by default.** Vanilla JS produces the cleanest output when an LLM writes the code, and it removes the build step. TypeScript is opt-in (see Non-goals).

## Non-goals

Things this template will not become.

- **A Discord bot framework.** No command groups, no preconditions DSL, no plugin loader. If you need those, use Sapphire.
- **TypeScript by default.** The build step and type configuration aren't worth it for the most common use case (a few slash commands). Adding TS is a 4-step opt-in documented below, not a default.
- **A multi-database starter.** No ORM, no migration framework. Bring your own (Prisma, Drizzle, plain `pg`) if you need persistence.
- **A Discord-feature kitchen sink.** No voice, no music, no moderation toolkit. Slash commands + interactions only; everything else is yours to add.
- **An auto-updating template.** Once you clone, it's your code. There is no `starter-series upgrade` path — that is by design (no hidden compatibility contract).

## CI / CD details

### CI (every PR + push to main)

| Step | What it does |
|------|-------------|
| Security audit | `npm audit` for dependency vulnerabilities |
| Lint | ESLint for code quality |
| Test | Jest with `--coverage`, thresholds enforced in `package.json` |
| Docker build | Builds the container image to catch build errors |
| Trivy scan | Scans the container image for CRITICAL CVEs (SHA-pinned action) |

### Security & maintenance

| Workflow | What it does |
|----------|-------------|
| CodeQL (`codeql.yml`) | Static analysis for security vulnerabilities (push/PR + weekly) |
| Maintenance (`maintenance.yml`) | Weekly CI health check — auto-creates issue on failure |
| Stale (`stale.yml`) | Labels inactive issues/PRs after 30 days, auto-closes after 7 more |

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

## Adding commands

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

  // Optional: opt into rate limiting
  rateLimit: { window: 5000, max: 3 },

  async execute(interaction) {
    const text = interaction.options.getString('text');
    await interaction.reply(text);
  },
};
```

Then register: `npm run deploy-commands`

Commands are auto-loaded — no need to edit any other file.

### Autocomplete

See `src/commands/search.js` for the autocomplete pattern. Add `.setAutocomplete(true)` on an option and export an `autocomplete(interaction)` function alongside `execute`:

```js
async autocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const matches = CHOICES
    .filter((c) => c.toLowerCase().includes(focused))
    .slice(0, 25) // Discord caps responses at 25 choices
    .map((c) => ({ name: c, value: c }));
  await interaction.respond(matches);
}
```

The dispatcher in `src/events/interactionCreate.js` routes `isAutocomplete()` interactions to this handler automatically.

### Opting into TypeScript

1. Add `typescript` and `@types/node` to `devDependencies`
2. Add a `tsconfig.json`
3. Update `npm start` to build and run from `dist/`
4. Rename `.js` files to `.ts`

## Health check

The bot exposes a tiny HTTP health server (`src/lib/health.js`) on `HEALTH_PORT` (default `3000`). It's used by the Docker `HEALTHCHECK` and by Fly.io / Railway to detect a crashed or disconnected bot process.

| Path | Status | Body |
|------|--------|------|
| `GET /health` (client ready) | `200` | `{ "status": "ok", "uptime": <seconds>, "guilds": <count> }` |
| `GET /health` (starting / disconnected) | `503` | `{ "status": "starting", "uptime": <seconds>, "guilds": 0 }` |

**Configuration**

```bash
# .env
HEALTH_PORT=3000   # change if 3000 is already taken on your host
```

**Fly.io** — add an HTTP service check to `fly.toml`:

```toml
[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.http_checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "30s"
    method = "get"
    path = "/health"
```

**Railway** — set the service's health-check path to `/health` and port to `3000` under **Settings → Deploy**.

**Docker** — `docker ps` will show `(healthy)` / `(unhealthy)` status automatically; the `HEALTHCHECK` runs `wget --spider http://localhost:${HEALTH_PORT}/health` every 30s.

## Contributing

PRs welcome. Please use the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## License

[MIT](LICENSE)
