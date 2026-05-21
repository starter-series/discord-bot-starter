<div align="center">

# Discord Bot Starter

**Discord.js + Docker + GitHub Actions CI/CD + 원클릭 배포.**

봇을 만들고, push로 배포하세요.

[![CI](https://github.com/starter-series/discord-bot-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/starter-series/discord-bot-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://www.docker.com/)

[English](README.md) | **한국어**

</div>

---

> **[Starter Series](https://github.com/starter-series/starter-series)** — 매번 AI한테 CI/CD 설명하지 마세요. clone하고 바로 시작하세요.
>
> [Docker Deploy](https://github.com/starter-series/docker-deploy-starter) · **Discord Bot** · [Telegram Bot](https://github.com/starter-series/telegram-bot-starter) · [Browser Extension](https://github.com/starter-series/browser-extension-starter) · [Electron App](https://github.com/starter-series/electron-app-starter) · [npm Package](https://github.com/starter-series/npm-package-starter) · [React Native](https://github.com/starter-series/react-native-starter) · [VS Code Extension](https://github.com/starter-series/vscode-extension-starter) · [MCP Server](https://github.com/starter-series/mcp-server-starter) · [Python MCP Server](https://github.com/starter-series/python-mcp-server-starter) · [Cloudflare Pages](https://github.com/starter-series/cloudflare-pages-starter)

---

## 빠른 시작

**[create-starter](https://github.com/starter-series/create-starter) 사용** (권장):

```bash
npx @starter-series/create my-discord-bot --template discord-bot
cd my-discord-bot && npm install
cp .env.example .env  # DISCORD_TOKEN + DISCORD_CLIENT_ID 입력
npm run deploy-commands
npm run dev
```

**또는 직접 clone:**

```bash
git clone https://github.com/starter-series/discord-bot-starter my-discord-bot
cd my-discord-bot && npm install
cp .env.example .env
npm run deploy-commands
npm run dev
```

Discord Developer Portal 설정은 [docs/DISCORD_SETUP.md](docs/DISCORD_SETUP.md)를 참고해 주세요.

## 포함된 구성

```
├── src/
│   ├── index.js                  # 진입점
│   ├── config.js                 # 환경변수 설정 로더
│   ├── commands/                 # 슬래시 커맨드 (자동 로드)
│   │   ├── index.js              # 로더
│   │   ├── ping.js               # /ping — 지연시간 확인
│   │   ├── help.js               # /help — 커맨드 목록
│   │   └── search.js             # /search — 자동완성 예제
│   ├── events/                   # 이벤트 핸들러 (자동 로드)
│   │   ├── ready.js              # 봇 준비 완료
│   │   ├── interactionCreate.js  # 커맨드 라우터
│   │   ├── error.js              # 클라이언트 에러 로거
│   │   └── warn.js               # 클라이언트 경고 로거
│   └── lib/
│       ├── health.js             # HTTP 헬스 서버
│       ├── logger.js             # 구조화 로거
│       ├── rate-limiter.js       # 사용자/커맨드별 토큰 버킷 제한
│       └── safe-interaction.js   # safeRespond() — 절대 throw하지 않는 reply/editReply/followUp 래퍼
├── scripts/
│   ├── deploy-commands.js        # Discord API에 커맨드 등록
│   └── bump-version.js           # package.json 버전 업
├── tests/                        # Jest — 테스트 27개, 커버리지 임계값 statements 70 %
├── Dockerfile                    # 프로덕션 컨테이너
├── docker-compose.yml            # 핫 리로드 개발 환경
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # 린트, 테스트, Docker 빌드, Trivy 스캔
│   │   ├── codeql.yml            # CodeQL 정적 분석
│   │   ├── cd-railway.yml        # Railway 배포 (액션은 SHA로 핀)
│   │   ├── cd-fly.yml            # Fly.io 배포
│   │   ├── maintenance.yml       # 주간 CI 헬스 체크
│   │   ├── stale.yml             # 비활성 이슈/PR 정리
│   │   └── setup.yml             # 첫 사용 시 자동 설정 체크리스트
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── DISCORD_SETUP.md          # Discord Developer Portal 가이드
│   └── DEPLOY_GUIDE.md           # Railway & Fly.io 배포 가이드
└── package.json
```

## 현재 구현된 것 (Currently implemented)

오늘자로 코드에 실제로 존재하는 것들입니다.

- **Discord.js v14** — 슬래시 커맨드, 임베드, 자동 로드 커맨드/이벤트 핸들러.
- **스타터 코드** — `/ping`, `/help`, `/search` (autocomplete 패턴); `ready`, `interactionCreate`, `error`, `warn` 이벤트.
- **런타임 안전성**
  - `src/lib/safe-interaction.js` — `safeRespond(interaction, payload)`이 인터랙션 상태에 따라 `reply` / `editReply` / `followUp` 중 적절한 것을 골라 호출하고, 만료된 인터랙션 / 중복 ack / unknown message 같은 Discord API 에러를 던지지 않고 흡수합니다.
  - `src/lib/rate-limiter.js` — 고정 윈도우 키별 제한. 글로벌 기본값은 사용자당 60초에 5회. 커맨드가 `rateLimit: { window, max }`을 export하면 그 값으로 덮어쓰기.
  - `src/lib/health.js` — `HEALTH_PORT` (기본 `3000`) 위 `/health` 엔드포인트. Dockerfile `HEALTHCHECK`에 연결되어 있습니다.
- **공급망 강화 (Supply-chain hardening)**
  - `npm ci --ignore-scripts`을 모든 곳에서 적용 — CI 워크플로, Railway CLI 설치, **그리고 프로덕션 Docker 빌드까지**. 트랜시티브 의존성의 install-time 임의 코드 실행 차단.
  - `package-lock.json` 커밋 및 `npm ci`로 강제.
  - 모든 third-party GitHub Action을 **커밋 SHA**로 핀(`softprops/action-gh-release`, `superfly/flyctl-actions/setup-flyctl`, `aquasecurity/trivy-action`). 떠다니는 태그 사용 금지. 업그레이드는 Dependabot으로만.
  - `gitleaks` `8.30.1`로 핀, sha256 체크섬 검증.
  - GitHub Secret Scanning + Push Protection + Dependabot security updates 활성화 (push 시점 차단, 사후 스캔 아님).
- **런타임 크래시 처리**
  - `process.on('uncaughtException')` + `process.on('unhandledRejection')`이 구조화 로거를 통과한 뒤 exit — 오케스트레이터가 stack을 보고, 조용한 죽음이 아님.
  - SIGINT/SIGTERM이 게이트웨이 클라이언트 + 헬스 서버를 우아하게 종료.
  - `npm start` / `npm dev`에 `--enable-source-maps`로 읽기 쉬운 stack trace.
- **CI 파이프라인** (모든 PR + main push 시) — `npm audit`, ESLint, Jest `--coverage` (statements / branches / functions / lines 모두 게이트), Docker 빌드, Trivy CRITICAL/HIGH 스캔.
- **CodeQL** — push/PR + 주간 정적 분석.
- **CD 파이프라인** — 원클릭 Railway 또는 Fly.io 배포 + GitHub Release 자동 생성. Actions 탭에서 수동 실행.
- **Docker** — 프로덕션 `Dockerfile` + 핫 리로드 개발용 `docker-compose.yml`.
- **버전 관리** — `npm run version:patch/minor/major`. CD에서 git 태그 중복 가드.
- **유지보수 자동화** — 주간 CI 헬스 체크, 비활성 이슈/PR 정리, 첫 사용 시 설정 체크리스트.
- **이중 언어 README** — 영어 + 한국어.

## 계획 (Planned)

진행 중인 로드맵 항목은 없습니다. 이 템플릿은 유지보수 단계이며, 보안 패치와 Discord.js 메이저 업그레이드는 Dependabot으로 들어옵니다. 구체적인 추가 제안이 있다면 이슈를 열어 주세요.

## 설계 의도 (Design intent)

이 템플릿이 *왜* 이런 모양인지에 대한 설명입니다.

**프레임워크가 아니라 가벼운 스타터.** [Sapphire](https://github.com/sapphiredev/framework)와 [Akairo](https://github.com/discord-akairo/discord-akairo)는 discord.js 위에 구조를 더하지만, 이 템플릿은 의도적으로 그러지 않습니다. 가치는 CI/CD, Docker, 공급망 자세, 런타임 안전성 라이브러리에 있지 — 자체 커맨드 디스패처에 있는 게 아닙니다.

|  | 이 템플릿 | Sapphire / Akairo |
|---|---|---|
| 철학 | 가벼운 스타터 + CI/CD + Docker | 런타임이 있는 풀 프레임워크 |
| 추상화 | Vanilla discord.js | 프레임워크 고유 패턴 |
| CI/CD | 풀 파이프라인 포함 | 미포함 |
| Docker | 프로덕션 레디 | 미포함 |
| 런타임 의존성 | 2개 (discord.js, dotenv) | 20개+ |
| AI/바이브코딩 | LLM이 깔끔한 vanilla JS 생성 | LLM이 프레임워크 규칙 학습 필요 |
| 적합한 용도 | 유틸리티 봇, 간단한 커맨드 | 복잡한 플러그인 시스템의 대형 봇 |

**안전성은 `src/lib/`에, 커맨드 파일이 아닌 곳에 산다.** 레이트 리미팅과 Discord API 에러 흡수는 import해서 쓰는 헬퍼지, 프레임워크 마법이 아닙니다. 커맨드 파일 하나는 30초 안에 위에서 아래로 읽을 수 있어야 합니다.

**공급망 자세가 차별점.** `--ignore-scripts`, SHA로 핀된 액션, lockfile-강제 install, gitleaks 체크섬 검증 — 모든 Discord 봇 템플릿이 갖춰야 할 것들이지만 대부분 갖추지 않은 것들. 이게 이 스타터가 존재하는 이유입니다.

**기본은 JavaScript.** Vanilla JS가 LLM이 코드를 쓸 때 가장 깨끗한 출력을 만들고, 빌드 단계도 없앱니다. TypeScript는 선택입니다 (Non-goals 참고).

## 비목표 (Non-goals)

이 템플릿이 **되지 않을** 것들입니다.

- **Discord 봇 프레임워크.** 커맨드 그룹, 사전 조건 DSL, 플러그인 로더 없음. 그게 필요하면 Sapphire를 쓰세요.
- **기본 TypeScript.** 빌드 단계와 타입 설정은 가장 흔한 용도(슬래시 커맨드 몇 개)에는 가치보다 비용이 큽니다. TS는 아래 4단계 옵트인이지 기본이 아닙니다.
- **다중 DB 스타터.** ORM 없음, 마이그레이션 프레임워크 없음. 영속성이 필요하면 Prisma, Drizzle, plain `pg` 등을 직접 가져오세요.
- **Discord 기능 종합 키트.** 음성, 음악, 모더레이션 툴킷 없음. 슬래시 커맨드 + 인터랙션만이며, 나머지는 직접 추가하세요.
- **자동 업데이트 템플릿.** 일단 clone하면 당신의 코드입니다. `starter-series upgrade` 같은 경로는 없고, 그게 의도입니다(숨겨진 호환성 계약 없음).

## CI / CD 세부

### CI (모든 PR + main push 시)

| 단계 | 역할 |
|------|------|
| 보안 감사 | `npm audit`로 의존성 취약점 확인 |
| 린트 | ESLint 코드 품질 검사 |
| 테스트 | Jest `--coverage`, 임계값은 `package.json`에서 강제 |
| Docker 빌드 | 컨테이너 이미지 빌드로 빌드 오류 검출 |
| Trivy 스캔 | 컨테이너 이미지의 CRITICAL CVE 스캔 (SHA로 핀된 액션) |

### 보안 & 유지보수

| 워크플로우 | 역할 |
|-----------|------|
| CodeQL (`codeql.yml`) | 보안 취약점 정적 분석 (push/PR + 주간) |
| Maintenance (`maintenance.yml`) | 주간 CI 헬스 체크 — 실패 시 이슈 자동 생성 |
| Stale (`stale.yml`) | 비활성 이슈/PR 30일 후 라벨링, 7일 후 자동 종료 |

### CD (Actions 탭에서 수동 실행)

| 단계 | 역할 |
|------|------|
| 버전 가드 | 해당 버전의 git 태그가 이미 있으면 실패 |
| 배포 | Railway 또는 Fly.io로 푸시 |
| GitHub Release | 자동 생성된 릴리즈 노트와 태그 릴리즈 생성 |

**배포 방법:**

1. GitHub Secrets 설정 (아래 참조)
2. 버전 업: `npm run version:patch` (또는 `version:minor` / `version:major`)
3. **Actions** 탭 → **Deploy to Railway** (또는 **Fly.io**) → **Run workflow**

### GitHub Secrets

#### Railway (`cd-railway.yml`)

| Secret | 설명 |
|--------|------|
| `RAILWAY_TOKEN` | Railway API 토큰 |
| `RAILWAY_SERVICE_ID` | 대상 서비스 ID |

#### Fly.io (`cd-fly.yml`)

| Secret | 설명 |
|--------|------|
| `FLY_API_TOKEN` | Fly.io 배포 토큰 |

자세한 설정은 **[docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)** 참고.

## 개발

```bash
# 핫 리로드로 시작
npm run dev

# 또는 Docker 사용
docker compose up

# Discord에 슬래시 커맨드 등록
npm run deploy-commands

# 버전 업 (package.json 자동 업데이트)
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0

# 린트 & 테스트
npm run lint
npm test
```

## 커맨드 추가하기

`src/commands/`에 새 파일을 만들어 주세요:

```js
// src/commands/echo.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('메시지를 따라합니다')
    .addStringOption(option =>
      option.setName('text').setDescription('따라할 텍스트').setRequired(true)
    ),

  // 선택: 레이트 리미팅 옵트인
  rateLimit: { window: 5000, max: 3 },

  async execute(interaction) {
    const text = interaction.options.getString('text');
    await interaction.reply(text);
  },
};
```

그리고 등록: `npm run deploy-commands`

커맨드는 자동 로드됩니다 — 다른 파일을 수정할 필요 없습니다.

### 자동완성 (Autocomplete)

자동완성 패턴은 `src/commands/search.js`를 참고해 주세요. 옵션에 `.setAutocomplete(true)`를 붙이고, `execute`와 함께 `autocomplete(interaction)` 함수를 export하면 됩니다:

```js
async autocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const matches = CHOICES
    .filter((c) => c.toLowerCase().includes(focused))
    .slice(0, 25) // Discord은 응답을 최대 25개로 제한
    .map((c) => ({ name: c, value: c }));
  await interaction.respond(matches);
}
```

`src/events/interactionCreate.js`의 디스패처가 `isAutocomplete()` 인터랙션을 자동으로 이 핸들러로 라우팅합니다.

### TypeScript 옵트인

1. `devDependencies`에 `typescript`와 `@types/node` 추가
2. `tsconfig.json` 추가
3. `npm start`를 `dist/`에서 빌드 후 실행하도록 수정
4. `.js` 파일을 `.ts`로 변경

## 헬스 체크

봇은 `HEALTH_PORT` (기본값 `3000`)에서 작은 HTTP 헬스 서버 (`src/lib/health.js`)를 엽니다. Docker `HEALTHCHECK`와 Fly.io / Railway가 봇 프로세스 크래시/연결 끊김을 감지하는 용도입니다.

| 경로 | 상태 | 응답 |
|------|------|------|
| `GET /health` (ready) | `200` | `{ "status": "ok", "uptime": <초>, "guilds": <수> }` |
| `GET /health` (시작 중 / 연결 끊김) | `503` | `{ "status": "starting", "uptime": <초>, "guilds": 0 }` |

**설정**

```bash
# .env
HEALTH_PORT=3000   # 3000이 이미 사용 중이면 변경
```

**Fly.io** — `fly.toml`에 HTTP 서비스 체크 추가:

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

**Railway** — **Settings → Deploy**에서 헬스 체크 경로를 `/health`, 포트를 `3000`으로 설정.

**Docker** — `docker ps`가 자동으로 `(healthy)` / `(unhealthy)` 상태를 표시합니다. `HEALTHCHECK`는 30초마다 `wget --spider http://localhost:${HEALTH_PORT}/health`를 실행합니다.

## 기여

PR 환영합니다. [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 사용해 주세요.

## 라이선스

[MIT](LICENSE)
