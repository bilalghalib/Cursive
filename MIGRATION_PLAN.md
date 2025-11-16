# Next.js Migration Plan - Cursive

**Project:** https://vercel.com/bilal-ghalibs-projects/cursive-draw/
**Current Status:** 30% feature parity
**Target:** 100% feature parity with legacy Flask app

---

## 📊 Migration Overview

### Completed ✅
- [x] Next.js 15 setup with App Router
- [x] TypeScript configuration
- [x] Tailwind CSS styling
- [x] Supabase client integration
- [x] Basic Canvas component (drawing functionality)
- [x] Basic Toolbar component
- [x] Vercel deployment configuration
- [x] Favicon and public assets
- [x] Environment variables setup

### In Progress 🚧
- [ ] API routes for Claude AI proxy
- [ ] AI service migration (OCR + Chat)
- [ ] Handwriting simulation
- [ ] Enhanced canvas (selection, OCR)
- [ ] Chat panel component

### Not Started ⏳
- [ ] Plugin system
- [ ] Export functionality (PDF, JSON, Web)
- [ ] Data persistence with Supabase
- [ ] Collaboration features
- [ ] Auth integration

---

## 🎯 Phase 1: Core AI Features (CURRENT)

**Goal:** Get OCR and AI chat working
**Time Estimate:** 4-6 hours
**Priority:** CRITICAL

### Tasks

#### 1. Create API Route for Claude Proxy
**File:** `app/api/claude/route.ts`
**Purpose:** Proxy requests to Anthropic API with user's or server's API key
**Features:**
- POST endpoint for AI requests
- Streaming support for chat responses
- Error handling
- Environment variable management

#### 2. Migrate AI Service
**Files:**
- `lib/aiService.ts` (new)
- Legacy: `legacy-static-site/static/js/aiService.js`

**Functions to migrate:**
- `sendImageToAI(imageData)` - OCR from canvas selection
- `sendChatToAI(messages, onProgress)` - Chat with streaming
- Response parsing

#### 3. Create Chat Panel Component
**File:** `components/ChatPanel.tsx`
**Features:**
- Message display (user + AI)
- Handwriting simulation for AI responses
- Streaming text animation
- Input handling

#### 4. Enhance Canvas Component
**File:** `components/Canvas.tsx`
**Add:**
- Selection rectangle functionality
- "Send to AI" button on selection
- Image capture from selection
- Integration with AI service

---

## 🎨 Phase 2: Handwriting Simulation

**Goal:** Render AI responses in simulated handwriting
**Time Estimate:** 3-4 hours
**Priority:** HIGH

### Tasks

#### 1. Create Handwriting Hook
**File:** `hooks/useHandwriting.ts`
**Purpose:** Convert text to SVG handwriting
**Source:** `legacy-static-site/static/js/handwritingSimulation.js`

**Features:**
- Multiple font styles (cursive, neat, print, messy)
- Character variation for realism
- Letter spacing and line wrapping
- SVG generation

#### 2. Integrate with Chat Panel
- Render AI messages as handwriting
- Animate character-by-character
- Configurable styles

---

## 💾 Phase 3: Data Persistence

**Goal:** Save and load notebooks from Supabase
**Time Estimate:** 2-3 hours
**Priority:** MEDIUM

### Tasks

#### 1. Create Data Service
**File:** `lib/dataService.ts`
**Source:** `legacy-static-site/static/js/dataManager.js`

**Functions:**
- `saveNotebook(notebook)` - Save to Supabase
- `loadNotebook(id)` - Load from Supabase
- `listNotebooks()` - Get user's notebooks
- `deleteNotebook(id)` - Delete notebook

#### 2. Add Notebook Management UI
**Files:**
- `components/NotebookList.tsx`
- `components/SaveDialog.tsx`

---

## 📤 Phase 4: Export Features

**Goal:** Export to PDF, JSON, and shareable URLs
**Time Estimate:** 3-4 hours
**Priority:** MEDIUM

### Tasks

#### 1. Create Export Service
**File:** `lib/exportService.ts`

**Functions:**
- `exportToPDF(canvas, chat)` - Generate PDF with jsPDF
- `exportToJSON(notebook)` - Export notebook data
- `exportToWeb(notebook)` - Create shareable URL

#### 2. Add Export Buttons to Toolbar
- PDF export button
- JSON download button
- Share button with URL generation

---

## 🔌 Phase 5: Plugin System

**Goal:** Extensible plugin architecture
**Time Estimate:** 4-6 hours
**Priority:** LOW

### Tasks

#### 1. Create Plugin Manager
**File:** `lib/pluginManager.ts`
**Source:** `legacy-static-site/static/js/pluginManager.js`

#### 2. Migrate Built-in Plugins
**Files:** `components/plugins/*.tsx`

**Plugins to migrate:**
- Calculator plugin
- OCR plugin
- Shape tools plugin
- Color picker plugin
- Templates plugin

---

## 🔐 Phase 6: Authentication & Billing

**Goal:** User accounts and subscription management
**Time Estimate:** 6-8 hours
**Priority:** LOW (for MVP)

### Tasks

#### 1. Integrate Supabase Auth
**Files:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `components/AuthProvider.tsx`

#### 2. Add Stripe Billing
**Files:**
- `app/api/stripe/route.ts`
- `components/SubscriptionManager.tsx`

---

## 📁 File Structure (After Migration)

```
Cursive/
├── app/
│   ├── api/
│   │   ├── claude/
│   │   │   └── route.ts         ✅ AI proxy endpoint
│   │   └── stripe/
│   │       └── route.ts         ⏳ Stripe webhooks
│   ├── (auth)/
│   │   ├── login/page.tsx       ⏳ Login page
│   │   └── signup/page.tsx      ⏳ Signup page
│   ├── layout.tsx               ✅ Root layout
│   ├── page.tsx                 ✅ Homepage
│   └── globals.css              ✅ Global styles
│
├── components/
│   ├── Canvas.tsx               🚧 Enhanced with selection
│   ├── Toolbar.tsx              ✅ Basic toolbar
│   ├── ChatPanel.tsx            ⏳ Chat UI
│   ├── NotebookList.tsx         ⏳ Notebook management
│   ├── SaveDialog.tsx           ⏳ Save UI
│   └── plugins/
│       ├── Calculator.tsx       ⏳ Calculator plugin
│       ├── OCR.tsx              ⏳ OCR plugin
│       └── ...                  ⏳ Other plugins
│
├── hooks/
│   ├── useCanvas.ts             ⏳ Canvas logic
│   ├── useHandwriting.ts        ⏳ Handwriting simulation
│   ├── useChat.ts               ⏳ Chat management
│   └── useNotebook.ts           ⏳ Notebook state
│
├── lib/
│   ├── supabase.ts              ✅ Supabase client
│   ├── auth.ts                  ✅ Auth utilities
│   ├── aiService.ts             ⏳ AI integration
│   ├── dataService.ts           ⏳ Data persistence
│   ├── exportService.ts         ⏳ Export functionality
│   └── pluginManager.ts         ⏳ Plugin system
│
└── public/
    └── favicon.svg              ✅ Favicon
```

---

## 🚀 Deployment Checklist

### Before Each Deploy
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Environment variables set in Vercel
- [ ] Test locally with `npm run dev`

### Environment Variables (Vercel)
```bash
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-...

# Required for database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional for app URL
NEXT_PUBLIC_APP_URL=https://cursive-draw.vercel.app
```

### After Deploy
- [ ] Test canvas drawing
- [ ] Test AI OCR
- [ ] Test AI chat
- [ ] Test handwriting simulation
- [ ] Test save/load
- [ ] Test export features

---

## 📈 Progress Tracking

| Feature | Legacy | Next.js | Status |
|---------|--------|---------|--------|
| Canvas Drawing | ✅ | ✅ | Done |
| Selection Tool | ✅ | ⏳ | Pending |
| OCR (Vision) | ✅ | ⏳ | Pending |
| AI Chat | ✅ | ⏳ | Pending |
| Handwriting Simulation | ✅ | ⏳ | Pending |
| Save/Load | ✅ | ⏳ | Pending |
| Export PDF | ✅ | ⏳ | Pending |
| Export JSON | ✅ | ⏳ | Pending |
| Share URL | ✅ | ⏳ | Pending |
| Plugins | ✅ | ⏳ | Pending |
| Authentication | ✅ | ⏳ | Pending |
| Billing | ✅ | ⏳ | Pending |

**Current Progress:** 30% → Target: 100%

---

## 🎯 Immediate Next Steps (This Session)

1. ✅ Create this migration plan
2. ⏳ Create API route: `app/api/claude/route.ts`
3. ⏳ Migrate AI service: `lib/aiService.ts`
4. ⏳ Create chat panel: `components/ChatPanel.tsx`
5. ⏳ Enhance canvas with selection tool
6. ⏳ Test OCR + chat flow end-to-end
7. ⏳ Commit and deploy to Vercel

---

**Let's build! 🚀**
