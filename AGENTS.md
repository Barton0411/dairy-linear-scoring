# Repository Guidelines

## Project Structure & Module Organization
- `miniprogram/`: WeChat Mini Program front‑end.
  - `pages/`: page flows (scoring: `pages/scoring/*`, records: `pages/records/*`).
  - `components/`: reusable UI (e.g. `components/trait-diagram/`).
  - `store/`: MobX state and scoring model (`store/index.js`).
  - `utils/`: request, export, helpers (e.g. `utils/request.js`, `utils/excelExport.js`).
  - `img/`: trait diagrams (`/img/<性状中文名>.png`).
- `server/`: Node/Express API (`server/src/routes/`, `server/src/scripts/`).
- `docs/prototypes/`: static UI prototypes for review (`docs/prototypes/index.html`).

## Build, Test, and Development Commands
- Backend (local): `cd server && npm install` → `cp .env.example .env` → `npm run db:init` → `npm run dev`.
- Backend smoke check: `curl http://localhost:3000/health`.
- Mini Program: `cd miniprogram && npm install`, then in WeChat DevTools: “工具 → 构建 npm”.
- Prototypes: `python3 docs/prototypes/generate.py` (updates `docs/prototypes/pages/*.png`).

## Coding Style & Naming Conventions
- JavaScript: 2‑space indent, single quotes, no semicolons, prefer `async/await`.
- Mini Program: keep pages focused on UI + events; keep business/state in `miniprogram/store/`.
- Use `wx.switchTab()` when navigating to tab pages (`pages/index/index`, `pages/records/list/list`, `pages/settings/settings`).

## Testing Guidelines
- Manual flow is the source of truth: follow `miniprogram/TEST_GUIDE.md` (login → farm select → scoring → result → offline → export).
- When changing UI, regenerate prototypes and review via `docs/prototypes/index.html`.

## Commit & Pull Request Guidelines
- Commit messages in history are verb‑first Chinese (e.g. “添加/更新/优化/初始化 …”); keep the same style and scope one change per commit.
- PRs should include: what/why, test steps, and screenshots (prefer linking `docs/prototypes/index.html` + compare view when UI changes).

## Security & Configuration Tips
- Never commit secrets (`.env`, tokens, real credentials). Keep local config in `.env` only.
- API endpoints/config live in `miniprogram/utils/request.js` and server `.env`—validate changes in a non‑prod environment first.
