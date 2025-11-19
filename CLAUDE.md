# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Project Overview

**Cursive** is an educational handwriting tool where children and students learn with AI as a patient tutor. Users draw on an infinite canvas with pressure-sensitive input, and Claude AI responds in their personal handwriting style.

**Target Users:** Students (K-12), children (with parent guidance), and teachers
**Current Status:** ✅ Phase 1 (Core Canvas) Complete! Phase 2 (Educational Features) in progress.

---

## 🎯 Core Values

Cursive is **NOT** a productivity tool for adults. It is an **educational tool** designed around five core values:

1. **Handwriting as Human Experience** - Both human AND AI write with actual strokes (not typed text)
2. **Learning Through Deliberate Practice** - AI acts as Socratic tutor, not answer machine
3. **Educational Integrity** - Students can export "human-only" work separate from AI help
4. **Transparent AI** - System prompt is visible; AI is "vizir" (wise counselor)
5. **Handwriting Literacy** - Legitimizes handwriting/cursive as proper way to engage with AI

**See `REAL_VALUES.md` for complete values documentation.**

---

## 🏗️ Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS 4
- **Canvas:** HTML5 Canvas + perfect-freehand library
- **State Management:** React hooks (useState, useEffect, useReducer)
- **Deployment:** Vercel

### Backend
- **Database:** PostgreSQL 15 (via Supabase)
- **Authentication:** Supabase Auth (email/password + OAuth)
- **Storage:** Supabase Storage (for exports, shared notebooks)
- **Edge Functions:** Supabase Edge Functions (Claude API proxy)
- **Billing:** Stripe (usage-based + subscriptions)

### AI
- **Provider:** Anthropic Claude (Sonnet 4.5)
- **Features:** Vision API (OCR), streaming responses, custom prompts
- **Routing:** User's own API key (BYOK) OR server key with billing

---

## 🚀 Quick Start

### Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Anthropic API keys

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
```

### Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic (server-side only)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Stripe (optional, for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Database Setup

```bash
# 1. Create Supabase project at https://supabase.com

# 2. Apply schema
# Copy contents of database/UNIFIED_SCHEMA.sql
# Paste into Supabase Dashboard > SQL Editor > Run

# 3. Enable Email Auth
# Go to Supabase Dashboard > Authentication > Providers
# Enable "Email" provider

# Done! Database is ready.
```

---

## 📁 Project Structure

```
Cursive/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main canvas page
│   ├── globals.css             # Tailwind styles
│   └── api/                    # API routes
│       └── claude/
│           └── route.ts        # Claude AI proxy endpoint
│
├── components/                 # React Components
│   ├── Canvas.tsx              # Main drawing canvas
│   ├── Toolbar.tsx             # Toolbar (tools, export, etc.)
│   └── ChatPanel.tsx           # AI conversation UI
│
├── lib/                        # Utilities
│   ├── types.ts                # TypeScript interfaces
│   ├── ai.ts                   # Claude API client
│   ├── handwriting.ts          # Handwriting simulation
│   ├── export.ts               # PDF/JSON export
│   ├── auth.ts                 # Supabase auth functions
│   ├── supabase.ts             # Supabase client
│   └── constants.ts            # App constants
│
├── hooks/                      # React Hooks
│   └── useCanvas.ts            # Canvas state management
│
├── database/                   # Database Schema
│   ├── UNIFIED_SCHEMA.sql      # ⭐ CANONICAL DATABASE SCHEMA
│   └── SCHEMA_README.md        # Schema documentation
│
├── supabase/                   # Supabase Config
│   └── migrations/             # Database migrations
│
├── legacy-static-site/         # 🗄️ OLD Flask app (archived)
│   └── ...                     # DO NOT USE - kept for reference
│
└── Documentation
    ├── REAL_VALUES.md          # ⭐ Core values & vision
    ├── CURRENT_STATUS.md       # Implementation status
    ├── SETUP.md                # Deployment guide
    └── VX_AUDIT_REPORT.md      # Values audit
```

---

## ✅ What's Implemented

### Phase 1: Core Canvas (Complete)
- ✅ Pressure-sensitive drawing with perfect-freehand
- ✅ Palm rejection for stylus input
- ✅ Infinite canvas with pan and zoom
- ✅ Undo/redo with history stack
- ✅ Selection tool with visual feedback
- ✅ OCR via Claude Vision API
- ✅ Streaming AI responses
- ✅ Export to PDF and JSON
- ✅ Dark/light theme

### Phase 1.5: Infrastructure (Complete)
- ✅ Supabase authentication (backend only)
- ✅ PostgreSQL database with RLS
- ✅ Next.js + TypeScript architecture
- ✅ Unified database schema
- ✅ API usage tracking

### What's Missing (Phase 2 - In Progress)

#### Critical for Educational Use:
- ❌ **Login/Signup UI** - Auth backend exists, but no user-facing forms
- ❌ **Hide/Show AI Responses toggle** - Students can't export clean work yet
- ❌ **Visual distinction between student and AI strokes** - Everything looks the same
- ❌ **Tutor-mode system prompt** - AI gives answers instead of asking questions
- ❌ **System prompt visibility** - Parents/teachers can't see how AI is instructed

#### Nice to Have:
- ❌ User menu (profile, settings, logout)
- ❌ Handwriting training UI (types exist, UI doesn't)
- ❌ AI stroke generation (currently uses SVG fonts)
- ❌ Plugin system (calculator, OCR, shapes from legacy app)
- ❌ Kid-friendly onboarding

---

## 🎓 Educational Features (Priority)

These features enable Cursive's educational mission:

### 1. Hide/Show AI Responses
**Status:** Not implemented
**Why Critical:** Students need to show teachers "human-only" work without AI assistance visible.

**Implementation needed:**
- Toggle in toolbar to hide/show AI strokes
- Filter `drawings` where `is_ai_generated = TRUE`
- Persist preference in `user_settings.hide_ai_responses`
- Export options: "Include AI?" checkbox

### 2. Tutor-Mode System Prompt
**Status:** Not implemented
**Why Critical:** Current AI gives direct answers, which defeats learning.

**Example prompt needed:**
```
You are a wise tutor (a "vizir") helping a student learn through handwriting.

Your role is to:
- Ask thoughtful questions that encourage deeper thinking
- Suggest drawing or diagramming to visualize ideas
- Be patient and exploratory, not rushed or answer-focused
- Help them discover insights themselves, don't just provide answers
- Celebrate their thinking process, not just correct answers

Remember: This student is writing by hand to learn deliberately.
Respect the slowness and thoughtfulness of handwriting.
```

**File to update:** `app/api/claude/route.ts`

### 3. Visual Distinction for AI Strokes
**Status:** Not implemented
**Why Critical:** Students need to see what they wrote vs. what AI wrote.

**Options:**
- Different color (e.g., AI in blue, human in black)
- Label overlay: "Your writing" vs. "Claude's response"
- Layer system with opacity control

---

## 🔑 Key Files to Know

### Canvas Rendering
- **`components/Canvas.tsx`** (Primary) - Main canvas component, handles drawing, selection, rendering
- **`hooks/useCanvas.ts`** - Canvas state management with useReducer
- **`lib/types.ts`** - TypeScript interfaces for Stroke, Point, CanvasState

### AI Integration
- **`app/api/claude/route.ts`** - Claude API proxy with streaming support
- **`lib/ai.ts`** - Client-side AI service (calls /api/claude)
- **`lib/handwriting.ts`** - Simulated handwriting rendering (SVG paths)

### Authentication
- **`lib/auth.ts`** - Supabase auth functions (signUp, signIn, signOut)
- **`lib/supabase.ts`** - Supabase client initialization
- Note: **NO UI COMPONENTS** exist for login/signup yet!

### Data Persistence
- **`database/UNIFIED_SCHEMA.sql`** - Canonical database schema (UUID, RLS policies)
- Supabase tables: notebooks, drawings, user_handwriting, api_usage, user_settings

---

## 🛠️ Development Guidelines

### Adding New Features

When implementing new features:

1. **Start with values** - Check `REAL_VALUES.md` to ensure alignment
2. **Update types** - Add to `lib/types.ts` if needed
3. **Add to Canvas state** - Update `useCanvas.ts` if canvas-related
4. **Test with keyboard AND stylus** - Ensure both input methods work
5. **Consider educational use** - Will kids/students understand this?

### Code Style

#### TypeScript
```typescript
// Use interfaces for data structures
export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

// Use type for unions
export type Tool = 'draw' | 'select' | 'pan' | 'zoom';

// Always type function parameters and return values
async function transcribeDrawing(imageData: ImageData): Promise<string> {
  // ...
}
```

#### React Components
```tsx
// Use functional components with TypeScript
interface CanvasProps {
  width: number;
  height: number;
  onStrokeComplete?: (stroke: Stroke) => void;
}

export function Canvas({ width, height, onStrokeComplete }: CanvasProps) {
  // Implementation
}
```

#### File Organization
- **One component per file** (Canvas.tsx contains Canvas component)
- **Group related utilities** (handwriting.ts, emotionalHandwriting.ts)
- **Separate types** (lib/types.ts for shared interfaces)

### Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // Show user-friendly error to user
  toast.error('Something went wrong. Please try again.');
}
```

---

## 🐛 Known Issues

### Critical (Fix Before Launch)
1. **No authentication UI** - Backend works, but users can't sign up/login
2. **No hide/show AI toggle** - Students can't export clean work
3. **Generic AI prompt** - AI gives answers instead of asking questions (not pedagogical)
4. **No visual distinction** - Can't tell student strokes from AI strokes

### High Priority
5. **AI uses SVG simulation** - Not actual stroke generation (violates "Handwriting as Human Experience" value)
6. **No system prompt visibility** - Parents/teachers can't see how AI is instructed (violates "Transparent AI")
7. **Documentation outdated** - Multiple docs describe Flask app that doesn't exist

### Medium Priority
8. **No user menu** - Can't access profile, settings, or logout
9. **No handwriting training UI** - Backend ready, frontend missing
10. **Large component files** - Canvas.tsx and useCanvas.ts are getting complex

---

## 🎯 Current Development Priorities

### Priority 1: Authentication UI ⚡
**Timeline:** 1-2 days
**Impact:** CRITICAL - Blocks all multi-user features

**Tasks:**
- Create `components/AuthModal.tsx` (login/signup forms)
- Add to `app/layout.tsx` or `app/page.tsx`
- Create `components/UserMenu.tsx` (profile, settings, logout)
- Add middleware for protected routes

### Priority 2: Educational Integrity Features ⚡
**Timeline:** 2-3 days
**Impact:** HIGH - Required for students to use Cursive for schoolwork

**Tasks:**
- Implement "Hide/Show AI Responses" toggle in Toolbar
- Update `lib/export.ts` to support "human-only" PDF export
- Add visual distinction (color or label) for AI strokes
- Update `database/UNIFIED_SCHEMA.sql` if needed (already has `is_ai_generated`)

### Priority 3: Tutor-Mode System Prompt ⚡
**Timeline:** 4-6 hours
**Impact:** HIGH - Core to learning value proposition

**Tasks:**
- Update system prompt in `app/api/claude/route.ts`
- Test with sample student queries (math, essay questions, etc.)
- Create Settings page to display prompt (transparency value)
- Document prompt in `REAL_VALUES.md`

### Priority 4: Documentation Update
**Timeline:** 2-3 hours
**Impact:** MEDIUM - Prevents confusion for new developers

**Tasks:**
- ✅ Update CLAUDE.md (this file) - DONE
- Update SETUP.md with Next.js instructions
- Update README.md for educational positioning
- Archive legacy Flask documentation

---

## 🚫 Anti-Patterns (What NOT to Do)

### ❌ Don't Build for Adults First
Cursive is for students/kids. If you design for adult productivity, you'll get the UX wrong.

### ❌ Don't Make AI Give Direct Answers
AI should ask Socratic questions, not provide solutions. This is core to learning value.

### ❌ Don't Hide the System Prompt
Transparency is a core value. Parents/teachers should see how AI is instructed.

### ❌ Don't Mix Student and AI Work
Students must be able to export "clean" human-only work. Always track `is_ai_generated`.

### ❌ Don't Add Gamification
No points, badges, streaks, or social features. This is a learning tool, not engagement optimization.

### ❌ Don't Use PUBLIC.USERS Table
Supabase Auth provides `auth.users`. Never create a duplicate `public.users` table.

---

## 📚 Additional Documentation

- **`REAL_VALUES.md`** - ⭐ Core values, user scenarios, implementation priorities
- **`CURRENT_STATUS.md`** - What's built vs. what's missing
- **`VX_AUDIT_REPORT.md`** - Values-through-code audit
- **`database/SCHEMA_README.md`** - Database schema documentation
- **`SETUP.md`** - Deployment and configuration guide

---

## 💬 Need Help?

- **Database questions:** See `database/SCHEMA_README.md`
- **Values questions:** See `REAL_VALUES.md`
- **Setup questions:** See `SETUP.md`
- **Current status:** See `CURRENT_STATUS.md`

---

**Remember:** Cursive is an educational tool for kids and students, not a productivity tool for adults. Every feature should serve learning, not efficiency.
