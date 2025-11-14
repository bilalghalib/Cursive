# Cursive Values Alignment - Action Plan

**Generated:** 2025-11-14
**Priority:** Urgent documentation fixes + values communication

---

## 🚨 CRITICAL: Immediate Actions (Do This Week)

### 1. Fix README Documentation Drift

**Problem:** README.md claims features don't exist that actually do exist (lines 102-107)

**Current (WRONG) Claims:**
```markdown
- **No user authentication** - single API key for all users
- **No rate limiting** - costs could spiral
- **No database** - uses localStorage only
- **No usage tracking** - can't monitor or bill
- **Security concerns** - CORS wildcard
```

**Reality:** All of these ARE implemented!
- ✅ Full authentication (auth.py, Flask-Login, JWT)
- ✅ Rate limiting (rate_limiter.py, 50/min, 500/day)
- ✅ Database (Supabase with RLS)
- ✅ Billing system (billing.py, Stripe, token tracking)
- ✅ Fixed CORS (proxy.py:79-88, specific origins only)

**Action:**
- [ ] Update "Known Limitations" section in README
- [ ] Change status from "Functional prototype" to "Beta - Phase 1 & 2 Complete"
- [ ] Update architecture diagram to show Supabase
- [ ] Remove completed items from roadmap (auth, database, billing)

**Owner:** Documentation team
**Deadline:** ASAP (this is misleading to users/contributors)

---

### 2. Document Handwriting Philosophy

**Problem:** Code treats handwriting as "thinking tool" but docs never explain this

**Impact:** Users might expect GoodNotes-style handwriting preservation and feel disappointed when workflow transcribes to text

**Action:**
Add to README (after "What is Cursive?" section):

```markdown
## Philosophy: Handwriting as Thinking

Cursive treats handwriting as a tool for **thinking**, not an archival format.

### Why Handwriting?

- **Slowness creates space** - Handwriting is deliberately slower than typing, creating room for ideas to develop
- **Messiness is safe** - Cross things out, draw arrows, explore without self-editing
- **Physical connection** - The act of writing with a stylus engages your mind differently than typing

### Why Transcription?

- **Text enables conversation** - Claude can engage with transcribed text more deeply than images alone
- **Strokes are preserved** - Your handwriting is saved with full pressure data, but text becomes the primary artifact
- **You choose** - Only transcribe when ready; handwriting can stand alone

**This is intentional.** If you want pure handwriting preservation, use GoodNotes or Notability.
If you want to **think through writing** and **develop ideas with AI**, use Cursive.
```

**Owner:** Product/Documentation
**Deadline:** This week

---

### 3. Create Plugin Guidelines Document

**Problem:** 5+ plugins exist, more planned, but no stated philosophy about boundaries

**Risk:** Feature creep could overwhelm contemplative core (notifications, gamification, integrations)

**Action:**
Create `PLUGIN_GUIDELINES.md`:

```markdown
# Cursive Plugin Development Guidelines

## Core Principle

Cursive plugins must support **contemplative use**, not productivity/optimization.

## ✅ Approved Plugin Patterns

Plugins that **extend canvas capabilities** without cluttering core experience:
- Drawing tools (shapes, colors, line styles)
- Thinking aids (calculator, templates, OCR)
- Export formats (different PDF styles, image formats)

## ❌ Rejected Plugin Patterns

Plugins that **violate core values**:
- ❌ Notifications, reminders, streaks, urgency
- ❌ Gamification (points, badges, leaderboards, levels)
- ❌ Social features (likes, followers, activity feeds)
- ❌ Analytics/tracking (session duration, feature usage)
- ❌ Auto-transcription or auto-AI (removes user agency)
- ❌ Always-on AI (makes AI authoritative, not collaborative)
- ❌ Subscription-gated core features (breaks accessibility)

## Approval Checklist

Before adding a plugin, ask:

1. Does it support contemplative use? (slowness, messiness, safety)
2. Does it preserve user agency? (opt-in, user-controlled)
3. Does it protect privacy? (no tracking, local-first)
4. Does it keep AI collaborative? (not authoritative)
5. Is it unobtrusive? (doesn't clutter canvas)

If any answer is "no," reject or redesign the plugin.
```

**Owner:** Engineering lead
**Deadline:** This week

---

## ⚠️ HIGH PRIORITY: Communication Improvements (This Month)

### 4. Add In-App Onboarding

**Problem:** New users don't understand values (contemplation, agency, privacy)

**Action:**
Create first-run experience (modal or tour):

```
Screen 1: "Welcome to Contemplative Creation"
- This isn't a productivity tool. It's a thinking tool.
- Write slowly. Make mistakes. Cross things out.
- The canvas is infinite. Your thoughts are private.

Screen 2: "AI is Your Conversation Partner"
- Select handwriting to transcribe it
- Claude will help you see patterns and ask questions
- You choose whether to keep AI's responses
- AI adapts to your style, not the reverse

Screen 3: "You're in Control"
- Your notebooks are private by default
- Use your own API key (BYOK) or ours (transparent 15% markup)
- Share when ready, revoke anytime
- No tracking, no surveillance, no surprises

Screen 4: "Start Writing"
- Try it: Write something messy on the canvas
- Select it and see what Claude notices
- Etch to canvas or dismiss - your choice
```

**Owner:** UX/Frontend
**Deadline:** End of month

---

### 5. Create Privacy Policy Page

**Problem:** Strong privacy practices (RLS, minimal tracking) aren't user-facing

**Action:**
Create `PRIVACY.md` and link from app:

```markdown
# Cursive Privacy Policy

## Our Philosophy

Your thoughts are yours. We collect the minimum data needed for billing and functionality.

## What We Collect

✅ **For functionality:**
- Email and password (encrypted)
- Notebook content (only you can access via RLS policies)
- Canvas state (zoom, pan - for your convenience)

✅ **For billing (if using our API key):**
- Token usage (input/output counts)
- Cost calculations (for transparent billing)
- Model used (for accurate pricing)

## What We DON'T Collect

❌ We never collect:
- Content analysis (topics, sentiment, keywords)
- Demographics (age, location, gender)
- Device fingerprinting
- Session duration or feature usage patterns
- Social graph (you can't follow/be followed)

## Your Rights

- **Private by Default:** Notebooks are only visible to you
- **Bring Your Own Key (BYOK):** Use your own API key, zero tracking
- **Delete Anytime:** Full data deletion on request
- **Export Anytime:** Download all your data (JSON, PDF)
- **Revoke Sharing:** Shared notebooks can be made private again
```

**Owner:** Legal/Documentation
**Deadline:** End of month

---

## ✅ MEDIUM PRIORITY: UX Enhancements (Next Quarter)

### 6. Enhance "Infinite Canvas" Feel

**Problem:** Canvas is technically infinite but doesn't feel boundless

**Action:**
- Add subtle grid that extends infinitely
- Show mini-map/position indicator when zoomed/panned
- Add "return to origin" button when far from start
- Fade grid at edges to suggest infinity

**Owner:** Frontend
**Deadline:** Next quarter

---

### 7. Improve AI Collaboration Affordances

**Problem:** Users might not understand AI is temporary unless they choose to keep it

**Action:**
- Modal should say "Claude's response (temporary)" at top
- "Etch to Canvas" button should be prominent and clear
- Add "Dismiss" button alongside "Etch to Canvas"
- Consider adding "Ask Follow-Up" before etching

**Owner:** UX/Frontend
**Deadline:** Next quarter

---

### 8. Add Cost Visibility

**Problem:** Token usage tracked but not shown to users in real-time

**Action:**
- Show token count after each AI interaction
- Show estimated cost (for non-BYOK users)
- Add "Usage This Month" in settings/account
- Send monthly usage summary email

**Owner:** Backend + Frontend
**Deadline:** Next quarter

---

## 🔮 FUTURE: Strategic Values Questions

### 9. Real-Time Collaboration

**Status:** Code exists (`collaborationService.js`) but not marketed

**Question:** Does real-time collaboration support or contradict contemplative values?

**Considerations:**
- ✅ Could enable thoughtful group brainstorming (like physical whiteboard)
- ⚠️ Could introduce performance anxiety (being watched while writing)
- ⚠️ Could add urgency (notifications when others join)

**Decision Needed:**
If enabling collaboration:
- Make it **opt-in** per notebook
- No presence indicators (no "John is typing...")
- No activity feed (no "Sarah added a drawing")
- Just: shared canvas, private cursors (you see others drawing but not judged)

---

### 10. Mobile App

**Roadmap Item:** Phase 5

**Question:** Does mobile support contemplation or introduce distraction?

**Considerations:**
- ✅ Tablet with stylus = contemplative (like iPad with Apple Pencil)
- ⚠️ Phone = possibly too small for handwriting
- ❌ Mobile notifications = breaks contemplative essence

**Decision Needed:**
If building mobile:
- Tablet-only (not phone)
- No notifications (ever)
- Offline-first (works without internet)
- Respect mobile UX patterns (don't fight platform)

---

### 11. Template Marketplace

**Roadmap Item:** Phase 5

**Question:** Do templates support or constrain contemplation?

**Considerations:**
- ✅ Could provide starting points (journal prompts, thinking frameworks)
- ⚠️ Could create "right way to use Cursive" anxiety
- ❌ "Most popular templates" = social pressure

**Decision Needed:**
If enabling templates:
- User-created only (no "official" templates)
- No popularity metrics (no "1000 people use this")
- No "recommended for you" (no algorithmic suggestions)
- Just: a library you can search

---

## Metrics That Matter (Aligned with Values)

### ✅ Track These (Value-Aligned)

- **Reliability:** Uptime, error rates, graceful degradation success rate
- **Transparency:** Cost accuracy, token tracking precision
- **Privacy:** Zero data breaches, RLS policy violations
- **Agency:** % users using BYOK, % choosing to etch vs dismiss AI responses

### ❌ Don't Track These (Value-Violating)

- Session duration (implies "more use = better")
- Daily active users (implies pressure to use daily)
- Feature adoption rates (implies features should be pushed)
- "Engagement" (implies attention is the goal)

---

## Summary: Urgent vs. Important

### 🚨 Do This Week:
1. Fix README documentation drift
2. Document handwriting philosophy
3. Create plugin guidelines

### ⚠️ Do This Month:
4. Add in-app onboarding
5. Create privacy policy page

### ✅ Do Next Quarter:
6. Enhance infinite canvas feel
7. Improve AI collaboration affordances
8. Add cost visibility

### 🔮 Decide Before Building:
9. Real-time collaboration approach
10. Mobile app strategy
11. Template marketplace philosophy

---

## Maintaining Values as You Grow

### Every Feature Should Ask:

1. **Contemplative Creation:** Does this support slow, messy, safe thinking?
2. **Collaborative Intelligence:** Does this keep AI adaptive, not authoritative?
3. **Sovereignty:** Does this preserve user control, privacy, agency?
4. **Trustworthy Tools:** Does this maintain reliability, transparency, honesty?

If any answer is "no," redesign or reject the feature.

### Warning Signs of Value Drift:

- Adding notifications or reminders
- Tracking "engagement" metrics
- Auto-transcription or auto-AI
- Social features (likes, followers)
- Gating features behind subscriptions
- Analyzing notebook content for suggestions
- Making AI responses more prominent than user writing

If you catch yourself considering any of these, **stop and revisit this document**.

---

**End of Action Plan**

Refer to:
- `VALUES_AUDIT.md` for full analysis
- `VALUES_EXPERIENCE.md` for VX → UX → UI mapping
- `CLAUDE.md` for technical roadmap
