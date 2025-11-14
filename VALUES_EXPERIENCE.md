# Cursive Values Experience (VX) Document
**Using Joe Edelman's Attention Policies Framework**

---

## Part 1: Discovering the Values Through Conversation

### Simulated Dialogue: Meaning Assistant × Cursive User

**Format:** This conversation uses Joe Edelman's "meaning assistant" approach to discover what users find meaningful about Cursive.

---

**Meaning Assistant:** Hey! I'm curious about your experience with Cursive. Can you tell me about a moment when using it felt particularly meaningful or valuable?

**User:** Oh, definitely. There was this time last week when I was stuck on a problem at work - like really stuck. I opened Cursive on my iPad and just started writing out my thoughts with the stylus. No structure, just... thinking with my hands, you know?

**MA:** I totally relate to that. There's something about writing things out by hand that's different from typing. What specifically felt valuable in that moment?

**User:** It's hard to explain. When I type, I feel like I'm already trying to make it coherent for someone else to read. But with handwriting, especially on Cursive, it's just for me. The slowness of it, the messiness - that feels okay. I can cross things out, circle stuff, draw arrows. It's thinking, not presenting.

**MA:** That makes sense. So the slowness wasn't a bug - it was actually part of what made it work?

**User:** Exactly! And here's the cool part - after I'd filled maybe two pages with messy thoughts, I selected this one paragraph and had Claude transcribe it. Just to see what I'd actually written, since my handwriting is terrible [laughs]. And Claude didn't just transcribe it - it saw patterns I hadn't noticed. It asked me a question that totally reframed the problem.

**MA:** What was different about that question? Like, you could've typed your thoughts into ChatGPT and asked for help, right?

**User:** Yeah, but... okay, this is going to sound weird. Because I'd already done the work of thinking through writing, the AI wasn't doing my thinking FOR me. It was like... a conversation partner who'd been listening carefully. Does that make sense?

**MA:** Completely. It reminds me of when you're working through something with a close friend - the act of explaining it out loud is where the insight happens, not in their response. Their response just helps you go deeper.

**User:** Yes! Exactly that. And the fact that Claude's response appeared in this handwriting-style font - I know it's fake, I know it's just SVG paths - but somehow it felt less... authoritative? Like it was sketching ideas alongside me, not handing down answers.

**MA:** So if I'm understanding right, there were a few things happening:
1. The physical act of handwriting helped you think without self-editing
2. The slowness created space for ideas to develop
3. The AI helped you see patterns, but didn't replace your thinking
4. The handwriting aesthetic made the AI feel collaborative, not authoritative

Which of those feels most important?

**User:** Hmm. If I had to pick... it's the combination. It's that I got to stay in control the whole time. I chose when to bring in the AI. I chose which part to transcribe. And I could even choose whether to keep Claude's response on my canvas or just dismiss it. That agency - that's huge.

**MA:** Tell me more about that agency. What does it let you do that you couldn't otherwise?

**User:** Okay, so I use a lot of AI tools for work. And most of them feel like they're driving. You know? You ask a question, you get an answer, and it's like... now what? Do I trust this? Is this the answer? With Cursive, the AI is clearly in the passenger seat. It can see the map, it can make suggestions, but I'm driving. My handwritten notes are the primary thing. The AI responses are... optional. Temporary, even, unless I choose to keep them.

**MA:** That's really interesting. It sounds like what's meaningful isn't just "getting help from AI" but specifically "maintaining creative control while getting help from AI."

**User:** Yeah. Exactly. And honestly? Sometimes I don't even use the AI part. Sometimes I just write, and the act of writing is enough. But knowing I COULD ask for help if I want - that's powerful.

**MA:** Got it. So let me try to capture what I'm hearing. You value:
- The **slowness and messiness** of handwriting, because it lets you think without performing
- The **choice** of when and how to involve AI, because it keeps you in control
- The **collaborative aesthetic** of simulated handwriting, because it frames AI as a conversation partner, not an authority
- The **privacy** of working in your own space, where messy thinking is safe

Does that resonate?

**User:** Yeah, that's pretty much it. Oh, and one more thing - I really value that I can use my own API key. Like, I'm not being tracked. My messy thoughts stay mine. That privacy is huge.

**MA:** Absolutely. So privacy isn't just "nice to have" - it's foundational to feeling safe enough to think messily in the first place.

**User:** Exactly.

---

## Part 2: Attention Policies (Sources of Meaning)

Based on the conversation above, here are the **attention policies** that capture what users find meaningful about Cursive.

These are what users should pay attention to in order to experience meaning from the tool.

---

### Source of Meaning #1: **Contemplative Creation**

**Attention Policies:**
- **MOMENTS** when thinking with your hands reveals patterns that typing would miss
- **SENSATIONS** of slowness and deliberation that create space for ideas to develop
- **OPPORTUNITIES** to think without self-editing, where messiness is safe
- **CHANGES** in your understanding that emerge through the physical act of writing
- **SPACES** where you can be uncertain, cross things out, and explore without judgment

**What This Captures:**
The value of **handwriting as a thinking tool**, not an archival format. The slowness is a feature, not a bug. The messiness is safety, not failure.

**How Code Supports This:**
- Pressure sensitivity preserves nuance of physical writing (`canvasManager.js:190-209`)
- Palm rejection eliminates interference (`canvasManager.js:92-118`)
- Infinite canvas means you never run out of space
- Undo/redo makes experimentation safe (`canvasManager.js:314-332`)
- Private by default (RLS policies) - your messy thoughts stay yours

---

### Source of Meaning #2: **Collaborative Intelligence (Not Replacement Intelligence)**

**Attention Policies:**
- **INSIGHTS** that emerge when AI helps you see patterns you hadn't noticed
- **QUESTIONS** from AI that reframe problems rather than solve them
- **MOMENTS** when AI's contribution feels like a conversation partner, not an authority
- **CHOICES** about when and how to involve AI, keeping you in creative control
- **CONVERSATIONS** where AI helps you think deeper, not replaces your thinking

**What This Captures:**
The value of AI as a **collaborator who listens and asks good questions**, not an oracle who hands down answers.

**How Code Supports This:**
- AI responses appear in **modal** (temporary), not automatically on canvas (`app.js:377-478`)
- User must choose to "Etch to Canvas" to make AI response permanent (`app.js:1524-1658`)
- AI adapts to user's handwriting style (neat/cursive/messy) (`app.js:1415-1446`)
- Simulated handwriting (not authoritative typography) makes AI feel collaborative
- User chooses which part to transcribe (via selection rectangle)

---

### Source of Meaning #3: **Sovereignty Over Your Thoughts**

**Attention Policies:**
- **CONTROL** over when AI sees your work, and which parts it sees
- **PRIVACY** that makes it safe to think incomplete, uncertain, messy thoughts
- **AUTONOMY** in choosing your own API key (BYOK), opting out of tracking entirely
- **AGENCY** in deciding whether AI contributions stay or go
- **OWNERSHIP** of your creative process, with AI as optional assistance

**What This Captures:**
The value of **maintaining creative control** while using AI. Your canvas is yours. Your thoughts are yours. AI is a guest, not a landlord.

**How Code Supports This:**
- RLS policies: only you can see your notebooks (database schema)
- BYOK option: use your own API key, no tracking (`proxy.py:206-217`)
- Selection-based transcription: AI only sees what you choose to show
- AI responses non-permanent by default
- No surveillance: minimal data collection (no demographics, session tracking, content analysis)

---

### Source of Meaning #4: **Trustworthy Tools**

**Attention Policies:**
- **RELIABILITY** when tools work even when services fail (graceful degradation)
- **TRANSPARENCY** about what things cost and why
- **HONESTY** from creators about what works and what doesn't
- **RESPECT** for your existing work (backwards compatibility, no data loss)
- **CRAFTSMANSHIP** in details that show care (pressure sensitivity, animations, polish)

**What This Captures:**
The value of **tools that respect users** through honest communication, careful engineering, and transparent pricing.

**How Code Supports This:**
- Graceful degradation: Redis optional, Supabase → localStorage fallback
- Transparent costs: 15% markup documented, token usage visible (`billing.py:80-90`)
- Honest documentation: CLAUDE.md lists weaknesses with line numbers
- Backwards compatibility: old drawings without pressure data still work
- Thoughtful details: palm rejection, pressure sensitivity, success/error animations

---

## Part 3: VX → UX → UI Mapping

Now we map the **Values Experience (VX)** to **User Experience (UX)** design decisions to **User Interface (UI)** implementation.

This ensures the code follows the values.

---

### Value: **Contemplative Creation**

#### VX (Attention Policies):
- MOMENTS when thinking with hands reveals patterns
- SENSATIONS of slowness and deliberation
- SPACES where messiness is safe

#### UX (Experience Design):
1. **Handwriting must feel natural and nuanced**
   - Pressure sensitivity to capture expression
   - Palm rejection to prevent interruption
   - Smooth, responsive drawing

2. **Canvas must feel limitless and non-judgmental**
   - Infinite canvas (no page boundaries)
   - Undo/redo for safe experimentation
   - Private by default

3. **No rush, no notifications, no urgency**
   - No timers, countdowns, or streaks
   - No "you haven't written in 3 days!" notifications
   - No social pressure (no likes, shares, followers)

#### UI (Implementation):
- ✅ `canvasManager.js:190-209` - Pressure sensitivity (50% to 200% line width)
- ✅ `canvasManager.js:92-118` - Palm rejection with stylus detection
- ✅ `canvasManager.js:314-332` - Undo/redo stack
- ✅ Database schema - RLS policies make notebooks private by default
- ✅ No social features in codebase
- ⚠️ **Gap:** Could add "infinite canvas" feeling with better visual indicators

#### Alignment Check: ✅ **STRONG**

---

### Value: **Collaborative Intelligence**

#### VX (Attention Policies):
- INSIGHTS when AI helps you see patterns
- QUESTIONS from AI that reframe, not solve
- MOMENTS when AI feels collaborative, not authoritative
- CHOICES about when to involve AI

#### UX (Experience Design):
1. **AI must be invoked, not automatic**
   - User selects area to transcribe (explicit action)
   - User chooses to send to AI
   - User chooses whether to keep response

2. **AI responses must feel collaborative, not authoritative**
   - Visual styling should be friendly, not corporate
   - Placement should be conversational, not commanding
   - Tone should be questioning, not declarative

3. **User must stay in control**
   - AI responses temporary by default
   - User can dismiss or keep
   - User can edit or respond

#### UI (Implementation):
- ✅ `canvasManager.js:621-710` - Selection rectangle (user chooses what to transcribe)
- ✅ `aiService.js:28-34` - Transcription only when user selects + clicks
- ✅ `app.js:377-478` - AI responses in modal (temporary, blocking)
- ✅ `app.js:1524-1658` - "Etch to Canvas" button (user chooses permanence)
- ✅ `handwritingSimulation.js` - Simulated handwriting (friendly, not corporate)
- ✅ `app.js:1415-1446` - AI matches user's handwriting style (adaptive, not imposing)

#### Alignment Check: ✅ **EXEMPLARY**
This is rare in AI tools. Most assume AI output should be primary. Cursive inverts this.

---

### Value: **Sovereignty Over Thoughts**

#### VX (Attention Policies):
- CONTROL over when AI sees your work
- PRIVACY that makes messy thinking safe
- AUTONOMY in choosing your own API key
- AGENCY in deciding AI's role
- OWNERSHIP of creative process

#### UX (Experience Design):
1. **Privacy must be default, not opt-in**
   - Notebooks private by default
   - Sharing is explicit user action
   - Minimal data collection

2. **User must control AI access**
   - BYOK option (bring your own key)
   - Selection-based transcription (AI only sees chosen areas)
   - Ability to delete/revoke sharing

3. **No surveillance or tracking of thoughts**
   - No content analysis
   - No topic tracking
   - No "we noticed you write about X a lot"

#### UI (Implementation):
- ✅ Database schema - RLS policies on all tables
- ✅ `models.py:62-100` - Encrypted API key storage (BYOK)
- ✅ `proxy.py:206-217` - User's API key takes priority
- ✅ `canvasManager.js:621-710` - Selection-based (user chooses what AI sees)
- ✅ Database schema - No content analysis fields
- ✅ `api_usage` table - Only tracks tokens/cost, not content
- ✅ `notebooks.is_shared` - Explicit sharing flag (default false)

#### Alignment Check: ✅ **EXEMPLARY**

---

### Value: **Trustworthy Tools**

#### VX (Attention Policies):
- RELIABILITY when tools work despite failures
- TRANSPARENCY about costs
- HONESTY from creators
- RESPECT for existing work
- CRAFTSMANSHIP in details

#### UX (Experience Design):
1. **Tool must work even when services fail**
   - Graceful degradation
   - Offline mode
   - Local-first architecture

2. **Costs must be visible and predictable**
   - Show token usage
   - Show cost per request
   - No surprise bills

3. **Creator communication must be honest**
   - Document weaknesses, not just strengths
   - Explain tradeoffs
   - No marketing fluff

4. **Never lose user data**
   - Backwards compatibility
   - Migration support
   - Clear versioning

#### UI (Implementation):
- ✅ `proxy.py:70-74` - Redis optional, filesystem fallback
- ✅ `dataManager.js:109-126` - Supabase → localStorage fallback
- ✅ `billing.py:80-90` - Transparent 15% markup
- ✅ `api_usage` table - Tracks tokens_input, tokens_output, cost
- ✅ CLAUDE.md - Lists weaknesses with line numbers
- ✅ README - Honest about limitations
- ✅ `canvasManager.js:353-418` - Backwards compatibility for old drawings
- ✅ `proxy.py:567-617` - Version management system

#### Alignment Check: ✅ **STRONG**

---

## Part 4: Gaps & Opportunities

### Where Code Doesn't Yet Support Values

#### Gap 1: **Handwriting Philosophy Not Communicated**

**Value:** Contemplative Creation (handwriting as thinking tool)

**Current State:**
- Code treats handwriting as **thinking tool** (workflow transcribes to text)
- Docs never explicitly state this philosophy
- New users might expect handwriting to be **primary artifact** (like GoodNotes)

**Impact:**
Users might feel disappointed when they realize workflow discards handwriting for text.

**Fix:**
Add to README and in-app onboarding:
```markdown
## Philosophy: Handwriting as Thinking

Cursive treats handwriting as a tool for thinking, not an archival format.

- **Write** to think through problems without self-editing
- **Transcribe** when you're ready to develop ideas with AI
- **Preserve** strokes as memories, but text as primary artifact

This is intentional. The slowness and messiness of handwriting create space
for contemplation. AI helps you develop those thoughts into something shareable.
```

**Priority:** 🔥 **HIGH** - This resolves user expectation mismatch

---

#### Gap 2: **Plugin Boundaries Undefined**

**Value:** Contemplative Creation (simplicity, focus, no feature creep)

**Current State:**
- 5+ plugins exist (calculator, OCR, shapes, templates, color picker)
- Roadmap includes more (collaboration, templates, voice-to-text)
- No stated philosophy about plugin boundaries
- Risk: Feature creep overwhelms contemplative core

**Impact:**
As plugins grow, Cursive could become a "productivity tool" with notifications, integrations, dashboards - losing contemplative essence.

**Fix:**
Document plugin philosophy in `PLUGIN_GUIDELINES.md`:
```markdown
## Plugin Approval Criteria

Cursive plugins must support contemplative use. Reject plugins that:

❌ Add notifications, streaks, or urgency
❌ Gamify the experience (points, badges, leaderboards)
❌ Require internet connection (local-first)
❌ Track user behavior for analytics
❌ Clutter the core canvas
❌ Make AI more prominent/authoritative

✅ Extend canvas capabilities (shapes, colors, etc.)
✅ Support different thinking styles (visual, mathematical, etc.)
✅ Remain opt-in and unobtrusive
✅ Preserve user privacy and control
✅ Enhance contemplation, not productivity
```

**Priority:** ⚠️ **MEDIUM** - Protect long-term values

---

#### Gap 3: **Infinite Canvas Not Fully Realized**

**Value:** Contemplative Creation (limitless space for exploration)

**Current State:**
- Canvas technically infinite (no bounds in code)
- But visually feels bounded (no indicators of infinite space)
- Users might not realize they can pan forever

**Impact:**
Feels more like "large canvas" than "infinite canvas"

**Fix:**
Add visual indicators:
```javascript
// canvasManager.js - Add subtle grid or paper texture that extends infinitely
// Show current position indicator (like a mini-map)
// Add "return to origin" button when panned far away
```

**Priority:** ✅ **LOW** - Nice-to-have, not critical

---

## Part 5: Scenarios - Living Into Values

### Scenario 1: **Graduate Student Thesis Writing**

**Context:** Maria is writing her philosophy thesis and feels stuck on a key argument.

**Living the Values:**

1. **Contemplative Creation**
   - Opens Cursive on iPad, switches to draw mode
   - Writes out argument in messy handwriting, crossing things out, drawing arrows
   - The slowness helps her notice a logical gap she'd missed when typing

2. **Collaborative Intelligence**
   - Selects the messy paragraph, has Claude transcribe it
   - Claude's transcription helps her see what she actually wrote (handwriting is messy)
   - Claude asks: "I notice you use 'freedom' two different ways here - are these the same concept?"
   - This reframing question unlocks a whole new section of her thesis

3. **Sovereignty**
   - Uses her own API key (BYOK) - university pays for it
   - Knows her messy drafts aren't being tracked or analyzed
   - Chooses NOT to keep Claude's response on canvas (just needed the question)
   - Her handwritten notes remain primary

4. **Trustworthy Tools**
   - Internet cuts out mid-session
   - Cursive keeps working (localStorage fallback)
   - When internet returns, syncs to Supabase
   - No data lost, no interruption to flow

**Outcome:** Thesis argument crystallizes. Maria credits "thinking with my hands" + "AI asking the right question at the right time."

**Values Expressed:** ✅ All four sources of meaning activated

---

### Scenario 2: **Engineering Team Whiteboarding Session**

**Context:** Team is debugging a complex distributed systems issue remotely.

**Living the Values:**

1. **Contemplative Creation**
   - Lead engineer shares Cursive notebook via share link
   - Team members draw diagrams, write hypotheses, sketch timelines
   - Messy collaborative canvas emerges (like physical whiteboard)

2. **Collaborative Intelligence**
   - Select a particularly confusing sequence diagram
   - Claude transcribes it and identifies: "This looks like a race condition in steps 3-4"
   - Team hadn't noticed the timing issue
   - This becomes the breakthrough

3. **Sovereignty**
   - After meeting, lead engineer **revokes share link**
   - Debugging notes return to private (contained sensitive architecture details)
   - Team chooses to keep Claude's insights but deletes raw diagrams

4. **Trustworthy Tools**
   - One team member on slow connection
   - Cursive gracefully degrades (they work locally, syncs when connection improves)
   - No one locked out due to connectivity issues

**Outcome:** Bug found and fixed. Team values that "whiteboard session" stayed ephemeral (share revoked) while insights were captured.

**Values Expressed:** ✅ All four sources of meaning activated

---

### Scenario 3: **Anxious Journaling at 2am**

**Context:** Alex can't sleep, mind racing with work anxiety.

**Living the Values:**

1. **Contemplative Creation**
   - Opens Cursive on iPad (dark mode), starts handwriting anxious thoughts
   - No structure, no sentences, just words and feelings
   - Slowness of handwriting becomes meditative
   - Doesn't use AI at all - just writes for 20 minutes

2. **Sovereignty**
   - Knows these thoughts are 100% private (RLS policies)
   - Uses own API key (BYOK) - even if AI used, not tracked
   - Could delete notebook entirely with no trace
   - This safety allows authentic expression

3. **Trustworthy Tools**
   - App doesn't suggest "AI therapy" or "mood tracking"
   - No notifications later asking "how are you feeling today?"
   - Just a blank canvas and privacy
   - Does exactly what it says, nothing more

**Outcome:** Alex falls asleep after writing. Never uses AI, never shares. Just needed private space to externalize thoughts.

**Values Expressed:** ✅ Contemplative Creation + Sovereignty + Trustworthy Tools
(Collaborative Intelligence not needed - tool supports this use case too)

---

## Part 6: Anti-Patterns (What Would Break These Values)

### ❌ Anti-Pattern 1: Auto-Transcription

**Hypothetical "Feature":**
"AI automatically transcribes everything you write in real-time!"

**Why This Breaks Values:**
- Removes **user control** (Sovereignty)
- Makes AI **ever-present** instead of **invoked** (Collaborative Intelligence)
- Eliminates **private messy thinking** (Contemplative Creation)
- Creates **surveillance feeling** (Trustworthy Tools)

**Guideline:** Never auto-transcribe. User must select + click.

---

### ❌ Anti-Pattern 2: "We Noticed You Write About..."

**Hypothetical "Feature":**
"Based on your notebooks, here are templates we think you'd like!"

**Why This Breaks Values:**
- Requires **content analysis** (violates Sovereignty)
- Makes AI **directive** instead of **responsive** (Collaborative Intelligence)
- Adds **surveillance** (breaks Trustworthy Tools)
- Introduces **algorithmic pressure** (breaks Contemplative Creation)

**Guideline:** Never analyze notebook content for suggestions. User-driven discovery only.

---

### ❌ Anti-Pattern 3: Social Features

**Hypothetical "Feature":**
"See what others are writing about! Follow users! Like notebooks!"

**Why This Breaks Values:**
- Introduces **performance anxiety** (breaks Contemplative Creation)
- Creates **privacy concerns** (violates Sovereignty)
- Adds **social pressure** (breaks contemplative essence)

**Guideline:** Sharing exists (user-controlled), but no social graph, likes, or follows.

---

### ❌ Anti-Pattern 4: Subscription That Removes Features

**Hypothetical "Feature":**
"Free tier: 5 AI queries/month. Pro tier: unlimited!"

**Why This Breaks Values:**
- Creates **anxiety about usage** (breaks Contemplative Creation)
- Removes **user agency** (free users can't use BYOK?)
- Breaks **accessibility promise** (Trustworthy Tools)

**Current Approach (Good):** Free tier = BYOK (unlimited). Pro tier = we provide API access with transparent markup.

**Guideline:** Never gate features. Gate convenience, not capability.

---

### ❌ Anti-Pattern 5: AI Responses More Prominent Than User Writing

**Hypothetical "Feature":**
"AI responses automatically appear in bright blue, larger font, on your canvas!"

**Why This Breaks Values:**
- Makes AI **authoritative** instead of **collaborative** (Collaborative Intelligence)
- **Visually subordinates** user's handwriting (breaks Contemplative Creation)
- Removes **choice** about permanence (violates Sovereignty)

**Current Approach (Good):** AI in modal (temporary), simulated handwriting (collaborative), user chooses to etch.

**Guideline:** User creation is primary. AI is secondary, always.

---

## Conclusion: Alignment Summary

### Overall VX → UX → UI Alignment: **9/10**

**Strengths:**
1. ✅ Code strongly embodies all four sources of meaning
2. ✅ Exceptional "AI as servant" pattern (rare in industry)
3. ✅ Privacy-first architecture (RLS, BYOK, minimal tracking)
4. ✅ Thoughtful UX details support values (pressure sensitivity, undo/redo, graceful degradation)

**Gaps:**
1. ⚠️ Handwriting philosophy never explicitly stated in docs
2. ⚠️ Plugin boundaries undefined (risk of feature creep)
3. ⚠️ "Infinite canvas" not fully realized visually

**Recommendations:**
1. 🔥 **Document handwriting philosophy** - Add "Philosophy" section to README
2. 🔥 **Define plugin guidelines** - Create `PLUGIN_GUIDELINES.md` with approval criteria
3. ✅ **Enhance infinite canvas feel** - Visual indicators of boundless space

**Verdict:**
Cursive is **exceptionally well-aligned** with its values in code.
The main gap is **communication** - users need to understand the philosophy to appreciate the design choices.

**Next Steps:**
1. Update README to reflect current implementation (remove "no auth, no database" claims)
2. Add "Philosophy" section explaining handwriting-as-thinking-tool
3. Create plugin guidelines to prevent feature creep
4. Consider in-app onboarding that explains values (contemplation, agency, privacy)

---

## Appendix: Using This Document

### For Designers:
When adding features, ask:
- Does this support **Contemplative Creation**? (slowness, messiness, safety)
- Does this support **Collaborative Intelligence**? (AI adaptive, not authoritative)
- Does this support **Sovereignty**? (user control, privacy, agency)
- Does this support **Trustworthy Tools**? (reliability, transparency, honesty)

If answer is "no" to all four, reconsider the feature.

### For Developers:
When implementing, reference the attention policies:
- Will this code help users notice **MOMENTS, SENSATIONS, OPPORTUNITIES, CHANGES, SPACES**?
- Will this code preserve user **CONTROL, PRIVACY, AUTONOMY, AGENCY, OWNERSHIP**?
- Will this code maintain **RELIABILITY, TRANSPARENCY, HONESTY, RESPECT, CRAFTSMANSHIP**?

### For Product Managers:
When prioritizing, ask:
- Does this feature **amplify** existing sources of meaning?
- Does this feature **introduce new sources** of meaning that align?
- Does this feature **contradict** any of the four values?

Prioritize 1 and 2. Reject 3.

### For Users:
When using Cursive, pay attention to:
- **Contemplative Creation** - Write messily, think slowly, explore without judgment
- **Collaborative Intelligence** - Invite AI when ready, keep control, choose permanence
- **Sovereignty** - Use BYOK if desired, share intentionally, trust privacy
- **Trustworthy Tools** - Rely on graceful degradation, understand costs, give feedback

---

**End of Values Experience Document**

This document maps Cursive's values (discovered through conversation) to attention policies (VX), to experience design (UX), to code implementation (UI).

Use it to maintain alignment as Cursive evolves.
