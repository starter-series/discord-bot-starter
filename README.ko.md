<div align="center">

# Discord Bot Starter

**Discord.js + Docker + GitHub Actions CI/CD + 원클릭 배포.**

봇을 만들고, push로 배포하세요.

[![CI](https://github.com/heznpc/discord-bot-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/heznpc/discord-bot-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://www.docker.com/)

[English](README.md) | **한국어**

</div>

---

## 빠른 시작

```bash
# 1. GitHub에서 "Use this template" 클릭 (또는 clone)
git clone https://github.com/heznpc/discord-bot-starter.git my-bot
cd my-bot

# 2. 의존성 설치
npm install

# 3. 환경 설정 (자세한 가이드: docs/DISCORD_SETUP.md)
cp .env.example .env
# .env 편집 → DISCORD_TOKEN과 DISCORD_CLIENT_ID 입력

# 4. 슬래시 커맨드 등록
npm run deploy-commands

# 5. 봇 시작
npm run dev
```

## 포함된 구성

```
├── src/
│   ├── index.js                  # 진입점
│   ├── config.js                 # 환경변수 설정 로더
│   ├── commands/                 # 슬래시 커맨드 (자동 로드)
│   │   ├── ping.js               # /ping — 지연시간 확인
│   │   └── help.js               # /help — 커맨드 목록
│   └── events/                   # 이벤트 핸들러 (자동 로드)
│       ├── ready.js              # 봇 준비 완료
│       └── interactionCreate.js  # 커맨드 라우터
├── scripts/
│   ├── deploy-commands.js        # Discord API에 커맨드 등록
│   └── bump-version.js           # package.json 버전 업
├── tests/
│   └── commands.test.js          # 구조 검증 테스트
├── Dockerfile                    # 프로덕션 컨테이너
├── docker-compose.yml            # 핫 리로드 개발 환경
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # 린트, 테스트, Docker 빌드
│   │   ├── cd-railway.yml        # Railway 배포
│   │   ├── cd-fly.yml            # Fly.io 배포
│   │   └── setup.yml             # 첫 사용 시 자동 설정 체크리스트
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── DISCORD_SETUP.md          # Discord Developer Portal 가이드
│   └── DEPLOY_GUIDE.md           # Railway & Fly.io 배포 가이드
└── package.json
```

## 주요 기능

- **Discord.js v14** — 슬래시 커맨드, 임베드, 자동 로드 커맨드/이벤트 핸들러
- **CI 파이프라인** — 보안 감사, 린트, 테스트, Docker 빌드 검증
- **CD 파이프라인** — 원클릭 Railway 또는 Fly.io 배포 + GitHub Release 자동 생성
- **Docker** — 프로덕션 Dockerfile + 핫 리로드 개발용 compose
- **버전 관리** — `npm run version:patch/minor/major`로 `package.json` 버전 업
- **개발 모드** — `npm run dev`로 `node --watch` 라이브 리로드
- **스타터 코드** — `/ping` + `/help` 커맨드, 모듈형 이벤트 핸들러
- **배포 가이드** — Discord, Railway, Fly.io 설정 단계별 문서
- **템플릿 셋업** — 첫 사용 시 설정 체크리스트 이슈 자동 생성

## CI/CD

### CI (모든 PR + main push 시)

| 단계 | 역할 |
|------|------|
| 보안 감사 | `npm audit`로 의존성 취약점 확인 |
| 린트 | ESLint 코드 품질 검사 |
| 테스트 | Jest (기본적으로 테스트 없이도 통과) |
| Docker 빌드 | 컨테이너 이미지 빌드로 빌드 오류 검출 |

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

자세한 설정은 **[docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)** 참고.

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

`src/commands/`에 새 파일을 만드세요:

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

  async execute(interaction) {
    const text = interaction.options.getString('text');
    await interaction.reply(text);
  },
};
```

그리고 등록: `npm run deploy-commands`

커맨드는 자동 로드됩니다 — 다른 파일을 수정할 필요 없습니다.

## Sapphire / Akairo 대신 이걸 쓰는 이유

[Sapphire](https://github.com/sapphiredev/framework) (700+ stars)와 [Akairo](https://github.com/discord-akairo/discord-akairo) (600+ stars)는 discord.js 위에 구조를 추가하는 봇 **프레임워크**입니다. 이 템플릿은 다른 접근입니다:

|  | 이 템플릿 | Sapphire / Akairo |
|---|---|---|
| 철학 | CI/CD를 갖춘 가벼운 스타터 | 런타임을 포함한 풀 프레임워크 |
| 추상화 | Vanilla discord.js | 프레임워크 고유 패턴 |
| 학습 곡선 | discord.js 문서만 읽으면 됨 | 프레임워크 API 학습 필요 |
| CI/CD | 풀 파이프라인 포함 | 미포함 |
| Docker | 프로덕션 레디 | 미포함 |
| 의존성 | 런타임 2개 (discord.js, dotenv) | 20개+ |
| AI/바이브코딩 | LLM이 깔끔한 vanilla JS 생성 | LLM이 프레임워크 규칙을 알아야 함 |
| 적합한 용도 | 유틸리티 봇, 간단한 커맨드 | 복잡한 플러그인 시스템의 대형 봇 |

**이 템플릿을 선택하세요:**
- 봇이 실제로 뭘 하는지 한 줄 한 줄 이해하고 싶을 때
- 프로덕션 CI/CD + Docker가 바로 필요할 때 (이걸 제공하는 다른 템플릿은 없습니다)
- AI 도구로 봇 코드를 생성할 때 — vanilla discord.js가 가장 깔끔한 AI 출력을 만듭니다
- 플러그인 아키텍처가 아닌 슬래시 커맨드 봇을 만들 때

**Sapphire/Akairo를 선택하세요:**
- 내장된 커맨드 파싱과 사전 조건 시스템이 필요할 때
- 대형 멀티 모듈 봇을 위한 플러그인 아키텍처가 필요할 때
- 인자 타입, 인히비터 등 프레임워크 수준의 기능이 필요할 때

### TypeScript는?

이 템플릿은 단순함을 위해 JavaScript를 사용합니다. TypeScript가 필요하면:

1. `devDependencies`에 `typescript`와 `@types/node` 추가
2. `tsconfig.json` 추가
3. `npm start`를 `dist/`에서 빌드 후 실행하도록 수정
4. `.js` 파일을 `.ts`로 변경

TypeScript는 강제가 아니라 선택입니다. 많은 봇 (유틸리티 커맨드, 간단한 자동화)에는 JavaScript만으로 충분합니다.

## 기여

PR 환영합니다. [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 사용해 주세요.

## 라이선스

[MIT](LICENSE)
