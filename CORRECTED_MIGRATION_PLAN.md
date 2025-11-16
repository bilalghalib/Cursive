# Corrected Migration Plan - Aligned with Cursive Values

**Date:** 2025-11-16
**Based on:** VALUES_EXPERIENCE.md, REAL_VALUES.md

---

## ❌ What I Got Wrong

### Mistake #1: Created a separate Chat Panel
**Why it's wrong:** Cursive's core value is **canvas-first interaction**. Everything happens ON the canvas through handwriting. A separate chat panel:
- Breaks the embodied handwriting experience
- Makes AI feel like a separate tool, not an integrated collaborator
- Goes against "handwriting as human experience"

**What I should do instead:** AI responses appear in a **temporary modal** → user chooses to "Stream to Canvas" as handwritten strokes

### Mistake #2: Used SVG simulation for AI responses
**Why it's wrong:** According to REAL_VALUES.md:
- AI should write with **actual strokes** (like human writing)
- SVG is "fake" - doesn't have pressure, timing, or stroke data
- "Both human AND AI write by hand (with actual strokes, not simulated)"

**What I should do instead:** Generate stroke arrays `{x, y, pressure, timestamp}[]` and render them using the same pipeline as human strokes

### Mistake #3: Thought OCR was a separate feature
**Why it's wrong:** OCR is already integrated into the "Select and Chat" tool. When user:
1. Selects handwritten region
2. Claude Vision transcribes it (OCR)
3. Claude responds to the content
4. Response appears in modal

**What I should do instead:** Just migrate the existing flow - no separate OCR feature needed

---

## ✅ What Cursive Actually Is

### Core User Flow
1. **Draw** handwritten notes on infinite canvas (with stylus/pen)
2. **Select** a region of handwriting (selection rectangle)
3. **Claude transcribes** the handwriting (OCR via Vision API)
4. **Claude responds** - appears in a **temporary modal**
5. **User chooses** to "Stream to Canvas" (makes AI response permanent as strokes)
6. **Export** with option to hide AI contributions (educational integrity)

### Core Values (NOT productivity features!)
1. **Handwriting as Human Experience** - embodied, tactile learning
2. **Learning Through Deliberate Practice** - slowness is pedagogical
3. **Educational Integrity** - distinguish human vs. AI work
4. **Transparent AI (Vizir)** - wise counselor, not black box
5. **Privacy & Sovereignty** - your thoughts stay yours

### Target Users
- **Primary:** Children (with parent guidance) - handwriting practice + thoughtful AI use
- **Secondary:** Students (K-12, college) - essay writing with AI tutoring
- **Tertiary:** Teachers/Schools - preserve handwriting, see student vs. AI work

---

## 📋 Actual Features to Migrate

### Phase 1: Core Canvas Interaction ✅ (Partially Done)
- [x] Canvas drawing with pressure sensitivity
- [x] Pan and zoom
- [x] Undo/redo
- [ ] Selection rectangle tool
- [ ] Infinite canvas (currently fixed size)
- [ ] Palm rejection (if supported by browser)

### Phase 2: AI Integration (Canvas-First!)
- [ ] Selection → Send to Claude Vision (OCR)
- [ ] AI Response Modal (temporary display)
- [ ] "Stream to Canvas" button → renders AI response as strokes
- [ ] AI stroke generation (NOT SVG - actual stroke arrays)
- [ ] Vizir system prompt (Socratic tutor, not assistant)

### Phase 3: Educational Features
- [ ] Layer control: Show/Hide AI responses
- [ ] Visual distinction: AI strokes vs. human strokes (color/label)
- [ ] Export options: "Include AI?" checkbox
- [ ] Visible system prompt in settings (transparency)

### Phase 4: Data & Persistence
- [ ] Save/load notebooks from Supabase
- [ ] Local storage fallback
- [ ] Share notebook URLs (with/without AI)
- [ ] Export to PDF (with/without AI)
- [ ] Export to JSON (separate human vs. AI stroke arrays)

### Phase 5: Polish
- [ ] Handwriting styles (neat, messy, cursive, print, architect)
- [ ] Theme toggle (dark/light)
- [ ] Toolbar organization
- [ ] Mobile/tablet optimization

---

## 🚫 Features NOT to Migrate

### ❌ Separate Chat Panel
**Reason:** Against core values - everything should be canvas-based

### ❌ Traditional Text Chat
**Reason:** Cursive is about handwriting, not typing

### ❌ Quick Answer Mode
**Reason:** AI should be a tutor (asks questions), not an answer machine

### ❌ Productivity Features (tasks, reminders, etc.)
**Reason:** This is an educational tool, not a productivity tool

### ❌ Social Features (comments, likes, followers)
**Reason:** Privacy and contemplative practice are core values

---

## 🎯 Immediate Next Steps (This Session)

### 1. Enhance Canvas Component ⏳
**File:** `components/Canvas.tsx`

**Add:**
- Selection rectangle tool (drag to select region)
- "Send to AI" button appears on selection
- Capture selected region as image data

### 2. Create AI Response Modal ⏳
**File:** `components/AIResponseModal.tsx`

**Features:**
- Displays AI response (initially as text)
- "Stream to Canvas" button
- "Dismiss" button
- Shows transcription + AI response

### 3. Add Stroke Generation (Future)
**File:** `lib/strokeGeneration.ts`

**Purpose:** Convert text → stroke arrays (not SVG!)
- Generate `{x, y, pressure, timestamp}[]` arrays
- Variability and imperfection (human-like)
- Multiple handwriting styles

### 4. Update API Route
**File:** `app/api/claude/route.ts`

**Changes:**
- Add vizir/tutor system prompt
- Socratic questioning mode
- NOT a generic assistant

---

## 📊 Progress After Correction

### Completed ✅
- Next.js setup
- TypeScript configuration
- Tailwind CSS
- Supabase client
- Basic canvas drawing
- API route for Claude (needs system prompt update)
- AI service library ✅
- Handwriting simulation utility ✅ (keep for reference, but will need stroke generation)

### In Progress 🚧
- Selection tool
- AI response modal
- Canvas-first AI interaction

### Not Started ⏳
- Stroke generation (AI writes with actual strokes)
- Educational features (show/hide AI, export options)
- Vizir system prompt
- Data persistence with Supabase

---

## 💡 Key Insights

### What Makes Cursive Special
1. **Everything happens ON the canvas** - no separate UI for AI
2. **AI writes like a human** - with strokes, not text or SVG
3. **Educational focus** - learning through deliberate handwriting practice
4. **Transparency** - system prompt visible, AI contributions distinguishable
5. **Privacy first** - BYOK, no tracking, RLS policies

### What NOT to Build
1. ❌ Productivity features (tasks, calendars, project management)
2. ❌ Social features (sharing, collaboration, comments)
3. ❌ Quick answer mode (AI should ask questions, not give answers)
4. ❌ Traditional chat interface (separate from canvas)
5. ❌ Text-based interaction (typing instead of handwriting)

---

## 🚀 Deployment Strategy

### MVP (Minimum Viable Product)
1. Canvas with selection tool
2. OCR (Claude Vision)
3. AI response modal
4. Basic "Stream to Canvas" (initially SVG, then migrate to strokes)
5. Save/load notebooks

### V1 (Full Educational Features)
1. AI stroke generation (actual strokes, not SVG)
2. Show/hide AI layer
3. Export with/without AI
4. Vizir system prompt
5. Visible system prompt in settings

### V2 (Polish & Scale)
1. Multiple handwriting styles
2. Collaboration features (if needed)
3. Teacher dashboard (see student vs. AI work)
4. Mobile app (native iOS/Android)

---

**Status:** ✅ Plan corrected. Ready to build the right thing!
