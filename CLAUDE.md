# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a mobile dairy cattle conformation linear scoring system (奶牛线性评定系统) for professional classifiers to conduct standardized evaluations at dairy farms. The project is being developed as a WeChat Mini Program with a Node.js backend.

## Current Development Status

**Active Branch**: `claude/project-goals-planning-UUE1p`
**Technology Stack**: WeChat Mini Program + Node.js + Aliyun PolarDB + Aliyun OSS

### Implemented Features

- ✅ Project structure setup (miniprogram + server)
- ✅ Database schema design with init script
- ✅ State management with MobX (store/index.js)
- ✅ Login system (pages/login/)
- ✅ Farm selection (pages/farm-select/)
- ✅ Cattle info input (pages/scoring/info/)
- ✅ Unified scoring UI (pages/scoring/unified/)
- ✅ Trait diagram display (components/trait-diagram + miniprogram/img)
- ✅ Photo capture page (pages/scoring/photo/)
- ✅ Result display page (pages/scoring/result/)
- ✅ Records list (pages/records/)
- ✅ Settings page (pages/settings/)
- ✅ Backend API routes (auth, farm, score, photo, sync, user)

### TODO Features

- ⏳ Export functionality
- ⏳ Offline sync implementation
- ⏳ Complete backend logic implementation

## Standards & Documentation

The system implements two Chinese national standards:

1. **GB/T 35568-2017**: Chinese Holstein cattle conformation classification technical specification
2. **T/DACS 002-2021**: Holstein cattle conformation classification operational technical specification

Full standard documents are located in `docs/`:
- `docs/569e46c1-b527-46aa-8527-112fac00d0a6.pdf` - GB/T 35568-2017
- `docs/da451265-cce3-4002-a16d-80eb4614142c.pdf` - T/DACS 002-2021

**These PDFs contain scoring diagrams that should be displayed when users click trait names during scoring.**

Additional planning documents:
- `docs/development-plan.md` - Complete development roadmap and API specs
- `docs/ui-design.md` - UI mockups and design specifications

## Core Business Logic

### Scoring System Architecture

The system evaluates 20 linear traits (1-9 scale) across 5 categories with specific weights:

- **Body Capacity (18%)**: Height (体高), chest width (胸宽), body depth (体深), loin strength (腰强度)
- **Rump (10%)**: Rump angle (尻角度), rump width (尻宽)
- **Feet & Legs (26%)**: Hoof angle (蹄角度), heel depth (蹄踵深度), bone quality (骨质地), rear legs side view (后肢侧视), rear legs rear view (后肢后视)
- **Mammary System (32%)**: 8 udder traits (乳房深度, 中央悬韧带, 前乳房附着, 前乳头位置, 前乳头长度, 后乳房附着高度, 后乳房附着宽度, 后乳头位置)
- **Dairy Character (14%)**: Angularity (棱角性)

**Note**: The weight in `store/index.js` shows Feet & Legs as 26% (not 20%), which differs from README. This aligns with development-plan.md.

### Linear to Functional Score Conversion

The system uses a non-linear mapping (store/index.js:76-84):
- Linear 1-9 → Functional 50,57,64,71,78,85,89,93,100
- This mapping is based on GB/T 35568-2017 Appendix F

### Unified Scoring Flow

- Default scores are prefilled for all traits; users typically only adjust abnormal traits and can reset to defaults.

### Photo Triggering Rules

Auto-prompt for photos when:
- Total score ≥ 85 (Excellent cattle)
- Total score ≤ 65 (Poor cattle)
- Severe defect traits present

### Score Grading System

- Ex (Excellent): 90-100
- VG (Very Good): 85-89
- GP (Good Plus): 80-84
- G (Good): 75-79
- F (Fair): 65-74
- P (Poor): <65

## Development Commands

### Backend Server

```bash
cd server

# Install dependencies
npm install

# Initialize database (creates tables and test data)
npm run db:init

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start
```

### Database Setup

1. Create `.env` file in `server/` directory (see `.env.example`)
2. Configure Aliyun PolarDB credentials
3. Configure Aliyun OSS credentials
4. Run `npm run db:init` to create tables

### WeChat Mini Program

Open `miniprogram/` directory in WeChat DevTools

## Project Structure

```
dairy-linear-scoring/
├── miniprogram/              # WeChat Mini Program frontend
│   ├── pages/
│   │   ├── index/           # Home page
│   │   ├── login/           # Login + verification
│   │   ├── farm-select/     # Farm selection
│   │   ├── scoring/         # Scoring pages
│   │   │   ├── info/        # Cattle info input
│   │   │   ├── unified/     # Unified scoring (default + quick edits)
│   │   │   ├── photo/       # Photo capture
│   │   │   └── result/      # Score result display
│   │   ├── records/         # Scoring records
│   │   └── settings/        # Settings
│   ├── store/
│   │   └── index.js         # MobX state management
│   ├── utils/
│   │   ├── util.js          # Helper functions
│   │   └── request.js       # API request wrapper
│   └── app.json             # Mini program config
│
├── server/                   # Node.js backend
│   ├── src/
│   │   ├── app.js           # Express app entry
│   │   ├── config/          # Database & OSS config
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   └── scripts/
│   │       └── init-db.js   # Database initialization
│   └── package.json
│
├── docs/                     # Documentation & standards
│   ├── *.pdf                # National standards (with scoring diagrams)
│   ├── development-plan.md  # Complete development plan
│   └── ui-design.md         # UI design mockups
│
└── scripts/
    └── test-connectivity.py  # Network testing utility
```

## Database Schema

### Key Tables

1. **appraiser_farms**: Maps appraisers to farms they can work with
   - Used for authentication (employee_id + appraiser_name)
   - Tracks certification status (is_certified)

2. **users**: WeChat user info linked to appraiser accounts
   - Stores openid, employee_id, certification status

3. **cattle**: Cattle registry
   - Unique constraint on (ear_tag, farm_code)

4. **scores**: Main scoring records
   - Stores all 20 trait scores (tg, xk, ts, yqd, kjd, kk, tjd, tgsd, gzd, hzcs, hzhs, rfsd, zyxrd, qrffz, qrtwz, qrtcd, hrffzgd, hrffzkd, hrtwz, ljx)
   - Calculated total_score and grade
   - Tracks appraiser info and certification status

5. **photos**: Photo attachments
   - Links to scores via score_id
   - Stores OSS keys and URLs
   - Photos are permanent (no delete functionality)

## State Management (MobX)

Central store located in `miniprogram/store/index.js`:

### Key State
- `userInfo`: Current logged-in user
- `currentFarm`: Selected farm
- `currentScoring`: Active scoring session data
- `settings`: User preferences including per-trait default scores

### Key Actions
- `startNewScoring(earTag, parity)`: Initialize new scoring session (prefill default scores)
- `updateScore(key, value)`: Update individual trait score
- `calculateTotalScore(scores)`: Compute weighted total score

### Important: Default Scores
Each of the 20 traits has its own default score in `settings.defaultScores`. Unchanged traits in the unified scoring flow use these defaults.

## API Endpoints

See `docs/development-plan.md` for complete API specs. Key routes:

- `POST /api/auth/login` - WeChat login
- `POST /api/auth/verify` - Appraiser verification (name + employee_id)
- `GET /api/farms` - Get farms for current user
- `POST /api/scores` - Submit scoring record
- `POST /api/photos/upload` - Upload photo to OSS
- `POST /api/farms/:code/export` - Export farm data to Excel

## Key Implementation Decisions

1. **Appraiser Authentication**: Users log in via WeChat, then verify identity by entering name + employee_id to match against appraiser_farms table

2. **Multi-Farm Access**: Appraisers can work with multiple farms. Must select current farm before scoring.

3. **Data Permissions**:
   - VIEW: All farm data (all appraisers' records)
   - CREATE: Own records only
   - EDIT/DELETE: Own records only

4. **Photo Storage**: Aliyun OSS, compressed before upload, permanent storage (no user delete)

5. **Offline Support**: Scores stored locally, auto-sync when online

6. **Validation**: All 20 traits must have scores before submission (no null/empty values)

7. **Trait Diagrams**: Implemented - clicking a trait name opens the corresponding local image via `components/trait-diagram` (images live in `miniprogram/img/`)

## Development Guidelines

### Trait Diagram Maintenance

To update or add diagrams:

1. Add/replace the PNG in `miniprogram/img/` (file names are Chinese trait names, e.g. `体高.png`)
2. Update the mapping in `miniprogram/components/trait-diagram/trait-diagram.js` (`traitImageMap` / `traitNameMap`)
3. Verify on `miniprogram/pages/scoring/unified/unified` and `miniprogram/pages/test-diagram/test-diagram`

### Unified Scoring Page

The app uses a single scoring flow with default scores prefilled:
- Page: `miniprogram/pages/scoring/unified/unified`
- UX: unchanged traits show as “默认”, supports per-trait reset and “全部恢复默认分”

### Photo Upload Strategy

- Compress images to 200-500KB before upload
- Upload happens in background after scoring
- Show "待上传 X 张" when offline
- Auto-retry 3 times on failure

## Important Notes

- All user-facing text should be in Chinese
- Scoring must work offline (field conditions)
- Performance critical: Appraisers evaluate many cattle per session
- Certification status (is_certified) must be visible in UI
- Export must include all fields defined in development-plan.md section 1.4
