# Contributing

Thanks for your interest in improving `discord-bot-starter`.

This is a **template repository**. Changes should keep the template thin and
opinionated — see the README's _Design intent_ and _Non-goals_ before opening
a PR.

## Before you open a PR

1. **Fork + branch** from `main`. Use a descriptive branch name like
   `fix/<short-slug>` or `feat/<short-slug>`.
2. **Run locally:**
   ```bash
   npm install
   npm run lint
   npm test
   ```
   Both must pass. Coverage thresholds are enforced in `package.json`.
3. **Build the Docker image** if you changed `Dockerfile`, `package.json`,
   or anything that affects production runtime:
   ```bash
   docker build -t discord-bot-starter:dev .
   ```
4. **Update both READMEs.** `README.md` (English) and `README.ko.md` (Korean)
   are kept in sync. If you change one, mirror the change in the other or
   note in the PR why you can't.

## What's in scope

- Bug fixes in `src/`, especially the runtime-safety lib (`src/lib/*`).
- CI / CD hardening: action pinning, permission scope reduction, supply-chain
  posture.
- Examples that demonstrate **vanilla discord.js** patterns (no framework
  abstractions).
- Docs corrections — Korean ↔ English drift, broken links, outdated
  Discord API names.

## What's out of scope

- A command framework, plugin loader, or command-group DSL — see _Non-goals_.
- Default TypeScript — the four-step opt-in stays an opt-in.
- A bundled database / ORM / queue — bring-your-own.
- Voice, music, moderation toolkits — slash commands + interactions only.

If you're unsure whether a change is in scope, open an issue first.

## Commits + PRs

- One logical change per PR. If you mix `chore/` + `feat/` work, split it.
- Commit messages: `type(scope): subject` — common types are `fix`, `feat`,
  `chore`, `docs`, `ci`, `refactor`. Examples in `git log`.
- Squash-merge is the default; PR title becomes the squash commit title.
- All `Co-Authored-By` trailers are removed by repo policy — heznpc is the
  sole author of all merged commits.

## Security

Do **not** open a public issue for vulnerabilities. See
[SECURITY.md](SECURITY.md) for the disclosure path.
