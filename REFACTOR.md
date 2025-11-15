# Cursive Refactor Documentation

**Date:** 2025-11-15
**Migration:** Flask + Vanilla JS → Next.js 15 + React + TypeScript
**Status:** ✅ Core migration complete, cleanup pending

---

## 📋 Executive Summary

Cursive has been completely refactored from a Flask/Python backend with vanilla JavaScript frontend to a modern Next.js 15 application with React, TypeScript, and Tailwind CSS v4.

### Key Changes

- **Backend:** Removed Flask entirely → Next.js API routes (future)
- **Frontend:** Vanilla JavaScript → React with TypeScript
- **Styling:** Old CSS → Tailwind CSS v4
- **Build System:** No build system → Next.js bundler
- **Database:** Supabase (unchanged, still using same database)
- **Deployment:** Python server → Vercel

---

## 🏗️ New Architecture

### Technology Stack

| Component | Old | New |
|-----------|-----|-----|
| Framework | Flask (Python) | Next.js 15 (React) |
| Language | JavaScript | TypeScript |
| Styling | Custom CSS | Tailwind CSS v4 |
| State Management | DOM manipulation | React Hooks |
| Routing | Flask routes | Next.js App Router |
| Build | None | Next.js bundler |
| Dev Server | `python proxy.py` | `npm run dev` |
| Production | Gunicorn | Vercel |

### Current File Structure

```
Cursive/
├── app/                          # Next.js App Router (NEW)
│   ├── layout.tsx               # Root layout with Font Awesome
│   ├── page.tsx                 # Homepage with Canvas + Toolbar
│   └── globals.css              # Tailwind CSS v4 imports
│
├── components/                   # React Components (NEW)
│   ├── Canvas.tsx               # Drawing canvas (ported from canvasManager.js)
│   └── Toolbar.tsx              # Tool selection UI (new)
│
├── lib/                         # Utilities (NEW)
│   ├── supabase.ts             # Supabase client (TypeScript)
│   └── auth.ts                 # Auth utilities (TypeScript)
│
├── public/                      # Static assets (NEW)
│   └── fonts/                  # Empty directory for custom fonts
│
├── supabase/                    # Supabase Edge Functions (UNCHANGED)
│   └── functions/              # Edge Functions for AI, etc.
│
├── node_modules/                # NPM dependencies (NEW)
│
├── .next/                       # Next.js build output (NEW)
│
├── next.config.js              # Next.js configuration (NEW)
├── tsconfig.json               # TypeScript configuration (NEW)
├── postcss.config.mjs          # PostCSS with Tailwind v4 (NEW)
├── package.json                # NPM dependencies (NEW)
├── .env.local                  # Environment variables (NEW)
│
└── [OLD FILES - TO DELETE]     # See cleanup section below
    ├── static/                 # Old vanilla JS files
    ├── templates/              # Old Flask templates
    ├── pages/                  # Old shareable pages system
    └── *.md (30+ docs)         # Old migration documentation
```

---

## 🗑️ Files to DELETE (Old Flask/Vanilla JS Setup)

### ❌ 1. Static Directory (Entire Directory)

**Path:** `static/`

**Contents:**
```
static/
├── config/
│   └── config.yaml             # Old YAML config (now using .env.local)
├── css/
│   └── styles.css              # Old custom CSS (now using Tailwind)
├── js/                         # All vanilla JavaScript files
│   ├── aiCanvasIntegration.js
│   ├── aiService.js
│   ├── aiService.supabase.js.disabled
│   ├── aiService.ts
│   ├── app.js                  # 1825 lines - replaced by app/page.tsx
│   ├── authService.js
│   ├── authService.js.disabled
│   ├── canvasManager.js        # 1639 lines - replaced by components/Canvas.tsx
│   ├── canvasWriteback.js
│   ├── collaborationService.js
│   ├── config.js
│   ├── config.ts
│   ├── dataManager.js
│   ├── dataManager.supabase.js.disabled
│   ├── env.example.js
│   ├── env.js                  # Old env config (now .env.local)
│   ├── handwritingSimulation.js # TODO: Port to React component
│   ├── handwritingStorage.js
│   ├── handwritingSynthesis.js
│   ├── handwritingTrainer.js
│   ├── initialDrawing.json
│   ├── llmStyleGuide.js
│   ├── pluginManager.js        # TODO: Port plugin system to React
│   ├── plugins/                # TODO: Port plugins to React
│   │   ├── calculatorPlugin.js
│   │   ├── colorPickerPlugin.js
│   │   ├── index.js
│   │   ├── ocrPlugin.js
│   │   ├── shapeToolsPlugin.js
│   │   └── templatesPlugin.js
│   ├── promptManager.js
│   ├── sharingService.js
│   ├── supabaseClient.js
│   ├── supabaseClient.js.disabled
│   ├── version.js
│   └── version.ts
└── types/                      # Old TypeScript types (moved to components)
    ├── api.ts
    ├── canvas.ts
    ├── config.ts
    ├── index.ts
    ├── notebook.ts
    └── plugin.ts
```

**Safe to delete?** ⚠️ **PARTIAL** - Most files can be deleted, but some need porting first:
- ✅ Delete `config/`, `css/` - fully replaced
- ⚠️ Keep `handwritingSimulation.js` - needs porting to React
- ⚠️ Keep `pluginManager.js` and `plugins/` - needs porting to React
- ✅ Delete all other `.js` files - replaced by React components
- ✅ Delete `types/` - can rewrite types in TypeScript components as needed

### ❌ 2. Templates Directory (Entire Directory)

**Path:** `templates/`

**Contents:**
```
templates/
└── user_pages.html             # Old Flask template
```

**Safe to delete?** ✅ **YES** - Flask templates are not used in Next.js

### ❌ 3. Pages Directory (Entire Directory)

**Path:** `pages/`

**Contents:**
```
pages/
└── .DS_Store                   # macOS metadata file
```

**Note:** This is the OLD shareable pages directory from Flask, NOT the Next.js pages directory. Next.js uses `app/` directory (App Router).

**Safe to delete?** ✅ **YES** - Old shareable pages system replaced by Supabase sharing

### ❌ 4. Old Documentation Files (30+ Markdown Files)

**Path:** `./` (root directory)

**Files to DELETE:**
```
❌ BUG_REPORT.md
❌ CLAUDE_4.5_UPGRADE.md
❌ DEV_SETUP.md
❌ EXECUTIVE_SUMMARY.md
❌ FIXES_APPLIED.md
❌ FLASK_TO_SUPABASE_MIGRATION.md
❌ HANDWRITING_SETUP.md
❌ HANDWRITING_WRITEBACK.md
❌ IMPLEMENTATION_PLAN.md
❌ MIGRATION_SUMMARY.md
❌ NEXT_STEPS.md
❌ QUICK_START.md
❌ REACT_MIGRATION_ANALYSIS.md
❌ SESSION_SUMMARY.md
❌ SETUP.md
❌ SETUP_SIMPLE.md
❌ SUPABASE_DEPLOYMENT.md
❌ SUPABASE_MIGRATION.md
❌ SUPABASE_SETUP.md
❌ SUPABASE_SUMMARY.md
❌ TS_MIGRATION.md
❌ VALUES_ACTION_PLAN.md
❌ VALUES_AUDIT.md
❌ VALUES_EXPERIENCE.md
❌ VERCEL_SUPABASE_REFACTOR.md
❌ apply_supabase_migration.md
❌ cursiveFromClaudeResearch.txt
❌ deploy-to-supabase.sh
```

**Files to KEEP:**
```
✅ README.md                    # Main project documentation (needs updating)
✅ CLAUDE.md                    # Claude Code project instructions (needs updating)
✅ NEXTJS_MIGRATION_STATUS.md   # Current migration status
✅ README_NEXTJS.md             # Next.js migration README
✅ PLUGINS.md                   # Plugin documentation (still relevant)
✅ REAL_VALUES.md               # Project values
✅ REFACTOR.md                  # This file
```

### ❌ 5. Empty Public Directory

**Path:** `public/fonts/`

**Contents:** Empty directory

**Safe to delete?** ⚠️ **KEEP** - Directory is part of Next.js structure. May be used for custom handwriting fonts later.

---

## ✅ Files to KEEP

### Core Next.js Files
```
✅ app/                         # Next.js App Router
✅ components/                  # React components
✅ lib/                         # Utilities
✅ public/                      # Static assets
✅ supabase/                    # Supabase Edge Functions
✅ node_modules/                # NPM dependencies
✅ .next/                       # Build output (gitignored)
```

### Configuration Files
```
✅ next.config.js               # Next.js configuration
✅ tsconfig.json                # TypeScript configuration
✅ postcss.config.mjs           # PostCSS with Tailwind v4
✅ package.json                 # NPM dependencies
✅ package-lock.json            # Dependency lock file
✅ .env.local                   # Environment variables (gitignored)
✅ .gitignore                   # Git ignore rules
```

### Documentation Files
```
✅ README.md                    # Main project docs (UPDATE NEEDED)
✅ CLAUDE.md                    # Claude Code instructions (UPDATE NEEDED)
✅ NEXTJS_MIGRATION_STATUS.md   # Migration status
✅ README_NEXTJS.md             # Next.js migration README
✅ PLUGINS.md                   # Plugin documentation
✅ REAL_VALUES.md               # Project values
✅ REFACTOR.md                  # This file
```

### Supabase Files
```
✅ supabase/config.toml         # Supabase project configuration
✅ supabase/functions/          # Edge Functions (AI, etc.)
✅ supabase/migrations/         # Database migrations
```

---

## 🔄 Migration Status

### ✅ Completed

1. **Next.js Setup**
   - ✅ Created `app/` directory with App Router
   - ✅ Set up TypeScript configuration
   - ✅ Configured Tailwind CSS v4
   - ✅ Installed production SaaS dependencies (Stripe, next-intl, Radix UI, etc.)

2. **Core Components**
   - ✅ `components/Canvas.tsx` - Drawing canvas with pointer events
   - ✅ `components/Toolbar.tsx` - Tool selection UI
   - ✅ `app/page.tsx` - Homepage layout
   - ✅ `app/layout.tsx` - Root layout with Font Awesome

3. **Supabase Integration**
   - ✅ `lib/supabase.ts` - Supabase client (TypeScript)
   - ✅ `lib/auth.ts` - Auth utilities
   - ✅ Environment variables in `.env.local`

4. **Build & Deployment**
   - ✅ Fixed Tailwind CSS v4 PostCSS configuration
   - ✅ Removed old Vite config
   - ✅ TypeScript compilation excludes `supabase/` and `static/`
   - ✅ Production build succeeds (`npm run build`)
   - ✅ Ready for Vercel deployment

### ⚠️ Pending (Porting from Old Codebase)

1. **Handwriting Simulation**
   - ⚠️ Port `static/js/handwritingSimulation.js` to React component
   - Multiple font styles (cursive, neat, print, messy)
   - Character-by-character variation
   - Simulated handwriting rendering

2. **Plugin System**
   - ⚠️ Port `static/js/pluginManager.js` to React context/hooks
   - ⚠️ Port plugins to React components:
     - `calculatorPlugin.js`
     - `colorPickerPlugin.js`
     - `ocrPlugin.js`
     - `shapeToolsPlugin.js`
     - `templatesPlugin.js`

3. **AI Service Integration**
   - ⚠️ Port `static/js/aiService.js` to TypeScript
   - Connect to Claude API via Supabase Edge Functions
   - OCR (Vision API) for handwriting transcription
   - Chat with streaming responses

4. **Canvas Features**
   - ⚠️ Pressure sensitivity for stylus input
   - ⚠️ Selection tool (capture area → send to Claude Vision)
   - ⚠️ Pan/zoom gestures (two-finger pinch/drag)
   - ⚠️ Undo/redo functionality (currently stubbed)

5. **Data Management**
   - ⚠️ Port `static/js/dataManager.js` to TypeScript
   - Notebook CRUD operations
   - Drawing persistence to Supabase
   - Export to PDF, JSON, shareable URLs

6. **UI Components**
   - ⚠️ Create `ChatPanel` component (AI conversation interface)
   - ⚠️ Create `ModalManager` component (modal interactions)
   - ⚠️ Create `ThemeManager` component (dark/light theme)

---

## 🧹 Cleanup Checklist

### Phase 1: Safe Deletions (No Dependencies)

```bash
# Delete old Flask templates
rm -rf templates/

# Delete old shareable pages directory
rm -rf pages/

# Delete old documentation files (30+ files)
rm BUG_REPORT.md
rm CLAUDE_4.5_UPGRADE.md
rm DEV_SETUP.md
rm EXECUTIVE_SUMMARY.md
rm FIXES_APPLIED.md
rm FLASK_TO_SUPABASE_MIGRATION.md
rm HANDWRITING_SETUP.md
rm HANDWRITING_WRITEBACK.md
rm IMPLEMENTATION_PLAN.md
rm MIGRATION_SUMMARY.md
rm NEXT_STEPS.md
rm QUICK_START.md
rm REACT_MIGRATION_ANALYSIS.md
rm SESSION_SUMMARY.md
rm SETUP.md
rm SETUP_SIMPLE.md
rm SUPABASE_DEPLOYMENT.md
rm SUPABASE_MIGRATION.md
rm SUPABASE_SETUP.md
rm SUPABASE_SUMMARY.md
rm TS_MIGRATION.md
rm VALUES_ACTION_PLAN.md
rm VALUES_AUDIT.md
rm VALUES_EXPERIENCE.md
rm VERCEL_SUPABASE_REFACTOR.md
rm apply_supabase_migration.md
rm cursiveFromClaudeResearch.txt
rm deploy-to-supabase.sh
```

### Phase 2: Port Then Delete (Has Dependencies)

**BEFORE deleting `static/js/`, you must:**

1. **Port handwriting simulation:**
   ```bash
   # Create React component
   components/HandwritingSimulator.tsx

   # Port logic from:
   static/js/handwritingSimulation.js
   ```

2. **Port plugin system:**
   ```bash
   # Create plugin context/hooks
   lib/plugins/PluginManager.tsx

   # Port plugins to:
   components/plugins/CalculatorPlugin.tsx
   components/plugins/ColorPickerPlugin.tsx
   components/plugins/OcrPlugin.tsx
   components/plugins/ShapeToolsPlugin.tsx
   components/plugins/TemplatesPlugin.tsx

   # Port logic from:
   static/js/pluginManager.js
   static/js/plugins/*.js
   ```

3. **Port AI service:**
   ```bash
   # Create TypeScript service
   lib/ai/aiService.ts

   # Port logic from:
   static/js/aiService.js
   ```

4. **Port data management:**
   ```bash
   # Create TypeScript service
   lib/data/dataManager.ts

   # Port logic from:
   static/js/dataManager.js
   ```

**AFTER porting, delete:**
```bash
# Delete entire static directory
rm -rf static/
```

### Phase 3: Update References

**Update `.gitignore`:**

Remove old Flask/Python entries:
```diff
- static/js/.DS_Store
- static/.DS_Store
- static/js/env.js

- # Flask
- instance/
- flask_session/
- .webassets-cache

- # Python
- __pycache__/
- *.py[cod]
- *$py.class
- *.so
- .Python

- # Auto-generated files
- static/js/version.js

Keep Next.js entries:
+ .next
+ .vercel
+ .env.local
```

**Update `README.md`:**

Replace old Flask setup with Next.js setup:
```diff
- ## 🚀 Quick Start
-
- ### Prerequisites
-
- - Python 3.8+
- - Anthropic API key ([get one here](https://console.anthropic.com/))
-
- ### Setup
-
- 1. **Clone the repository**
-    ```bash
-    git clone https://github.com/bilalghalib/Cursive.git
-    cd Cursive
-    ```
-
- 2. **Install dependencies**
-    ```bash
-    pip install -r requirements.txt
-    ```
-
- 3. **Configure API key**
-
-    Create a `.env` file in the root directory:
-    ```env
-    CLAUDE_API_KEY=your_anthropic_api_key_here
-    ```
-
- 4. **Run the development server**
-    ```bash
-    python proxy.py
-    ```
-
- 5. **Open in browser**
-
-    Navigate to `http://localhost:5022/`
-
- ### Production Deployment
-
- For production, use Gunicorn with WSGI:
-
- ```bash
- gunicorn wsgi:app --bind 0.0.0.0:5022 --workers 4
- ```

+ ## 🚀 Quick Start
+
+ ### Prerequisites
+
+ - Node.js 18+ and npm
+ - Supabase account ([get one here](https://supabase.com/))
+
+ ### Setup
+
+ 1. **Clone the repository**
+    ```bash
+    git clone https://github.com/bilalghalib/Cursive.git
+    cd Cursive
+    ```
+
+ 2. **Install dependencies**
+    ```bash
+    npm install
+    ```
+
+ 3. **Configure environment variables**
+
+    Create a `.env.local` file in the root directory:
+    ```env
+    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
+    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
+    ```
+
+ 4. **Run the development server**
+    ```bash
+    npm run dev
+    ```
+
+    The app will be available at:
+    - Local: http://localhost:3000
+    - Network: http://[your-ip]:3000 (for testing on iPad/tablet)
+
+ ### Production Deployment
+
+ Deploy to Vercel with one click:
+
+ ```bash
+ npm run build        # Test production build locally
+ vercel --prod        # Deploy to production
+ ```
+
+ Or connect your GitHub repository to Vercel for automatic deployments.
```

**Update `CLAUDE.md`:**

Update build commands and tech stack:
```diff
- ## 🚀 Build Commands
-
- ### Development
- ```bash
- python proxy.py              # Run Flask dev server on port 5022
- ```
-
- ### Production
- ```bash
- gunicorn wsgi:app --bind 0.0.0.0:5022 --workers 4
- ```

+ ## 🚀 Build Commands
+
+ ### Development
+ ```bash
+ npm run dev                  # Run Next.js dev server on port 3000
+ ```
+
+ ### Production
+ ```bash
+ npm run build               # Create production build
+ npm run start               # Run production server locally
+ vercel --prod               # Deploy to Vercel
+ ```

- ### Backend
- - **Framework:** Flask (Python)
- - **Database:** PostgreSQL with SQLAlchemy ORM
- - **Cache/Sessions:** Redis (optional, falls back to filesystem)
- - **Authentication:** Flask-Login with JWT support
- - **Rate Limiting:** Flask-Limiter with Redis backend
- - **Billing:** Stripe integration
- - **Production Server:** Gunicorn (WSGI)
- - **AI SDK:** Anthropic Python SDK
- - **Environment:** python-dotenv for config
-
- ### Frontend
- - **Architecture:** Vanilla JavaScript ES6 modules (no build step)
- - **Canvas:** HTML5 Canvas API with pointer events
- - **Storage:** REST API + PostgreSQL (with localStorage fallback for legacy support)
- - **Exports:** jsPDF, FileSaver.js

+ ### Backend
+ - **Framework:** Next.js 15 (React framework with API routes)
+ - **Database:** Supabase (PostgreSQL)
+ - **Authentication:** Supabase Auth
+ - **Storage:** Supabase Storage
+ - **Edge Functions:** Supabase Edge Functions (Deno)
+ - **AI SDK:** Anthropic SDK (via Edge Functions)
+ - **Environment:** .env.local for config
+
+ ### Frontend
+ - **Framework:** React 18 with Next.js App Router
+ - **Language:** TypeScript
+ - **Styling:** Tailwind CSS v4
+ - **UI Components:** Radix UI primitives
+ - **Canvas:** HTML5 Canvas API with React hooks
+ - **State Management:** React hooks (useState, useEffect, useRef)
+ - **Storage:** Supabase client (real-time sync)
+ - **Exports:** jsPDF, FileSaver.js
+ - **Notifications:** Sonner (toast notifications)
+ - **Payments:** Stripe integration
+ - **Internationalization:** next-intl
+ - **Analytics:** Vercel Analytics
```

---

## 📝 TODO: Documentation Updates Needed

### README.md

**Sections to update:**

1. ✅ **Quick Start** - Replace Flask with Next.js setup (see above)
2. ✅ **Tech Stack** - Update from Flask/Python to Next.js/React (see above)
3. ❌ **Architecture** - Update backend section (remove Flask references)
4. ❌ **Modernization Roadmap** - Mark Phase 3 (TypeScript migration) as complete
5. ❌ **Project Structure** - Update file tree to reflect new Next.js structure
6. ❌ **Contributing** - Update development workflow for Next.js

### CLAUDE.md

**Sections to update:**

1. ✅ **Build Commands** - Replace Flask commands with Next.js (see above)
2. ✅ **Development Environment** - Update tech stack (see above)
3. ❌ **Project Structure** - Update file tree
4. ❌ **Key Components** - Remove Flask references, add React component docs
5. ❌ **Code Style Guidelines** - Update for TypeScript/React
6. ❌ **Testing Guidelines** - Update for Vitest/Playwright (when added)

### New Documentation Needed

1. **COMPONENTS.md** - Document all React components
2. **API.md** - Document Next.js API routes (when added)
3. **DEPLOYMENT.md** - Vercel deployment guide
4. **CONTRIBUTING.md** - Contribution guidelines for React/TypeScript

---

## 🎯 Known Issues & Caveats

### 1. Font Awesome (CDN Dependency)

**Current:** Font Awesome loaded via CDN in `app/layout.tsx`
```tsx
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
```

**Issue:** CDN dependency may cause slow loading or failures

**Recommendation:** Replace with `lucide-react` (already installed) or `@fortawesome/react-fontawesome`

**Migration:**
```bash
# Option 1: Use lucide-react (preferred)
# Already installed, just replace icons in Toolbar.tsx

# Option 2: Use Font Awesome React components
npm install @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
```

### 2. Google Fonts (CDN Dependency)

**Current:** Google Fonts loaded via CDN in `app/layout.tsx`
```tsx
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat&family=Indie+Flower&family=Dancing+Script&display=swap" />
```

**Issue:** Required for handwriting simulation, but CDN dependency

**Recommendation:** Use Next.js `next/font/google` for optimized loading

**Migration:**
```tsx
// app/layout.tsx
import { Architects_Daughter, Caveat, Indie_Flower, Dancing_Script } from 'next/font/google';

const architectsDaughter = Architects_Daughter({ weight: '400', subsets: ['latin'] });
const caveat = Caveat({ weight: '400', subsets: ['latin'] });
const indieFlower = Indie_Flower({ weight: '400', subsets: ['latin'] });
const dancingScript = Dancing_Script({ weight: '400', subsets: ['latin'] });
```

### 3. Canvas Component Incomplete

**Missing features:**

- ⚠️ Pressure sensitivity (stylus input)
- ⚠️ Selection tool (rectangle → capture → send to AI)
- ⚠️ Pan/zoom gestures (two-finger pinch/drag)
- ⚠️ Undo/redo implementation (currently just state)
- ⚠️ Export to PDF/JSON
- ⚠️ Real-time collaboration

**These features exist in** `static/js/canvasManager.js` **and need porting**

### 4. No AI Integration Yet

**Missing:**

- Claude Vision API for OCR (handwriting transcription)
- Claude Chat API for conversational responses
- Streaming response rendering
- Simulated handwriting for AI responses

**These features exist in** `static/js/aiService.js` **and need porting**

### 5. No Plugin System Yet

**Missing:**

- Plugin registration and lifecycle
- Calculator plugin
- OCR plugin
- Shape tools plugin
- Color picker plugin
- Templates plugin

**These features exist in** `static/js/pluginManager.js` **and** `static/js/plugins/*.js` **and need porting**

---

## 🚀 Deployment Checklist

### Before Deploying to Production

- [x] Next.js production build succeeds (`npm run build`)
- [x] Tailwind CSS v4 configured correctly
- [x] TypeScript compilation has no errors
- [x] Environment variables set in `.env.local`
- [ ] Update `README.md` with Next.js instructions
- [ ] Update `CLAUDE.md` with React/TypeScript guidelines
- [ ] Delete old Flask files (Phase 1: Safe Deletions)
- [ ] Port handwriting simulation to React
- [ ] Port plugin system to React
- [ ] Port AI service to TypeScript
- [ ] Test Canvas component on iPad/tablet with stylus
- [ ] Test authentication flow with Supabase
- [ ] Set up Vercel project and environment variables
- [ ] Configure Vercel deployment settings
- [ ] Test production deployment
- [ ] Set up custom domain (if needed)
- [ ] Configure analytics and monitoring

---

## 📞 Support

If you encounter issues during cleanup or migration:

1. Check `NEXTJS_MIGRATION_STATUS.md` for current status
2. Review `REFACTOR.md` (this file) for guidance
3. Open a GitHub issue with details

---

**Last Updated:** 2025-11-15
**Next Review:** After completing Phase 2 cleanup (porting remaining features)
