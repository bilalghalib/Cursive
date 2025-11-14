# Cursive: Real Values & Vision
**Based on Creator Interview - 2025-11-14**

---

## Core Insight: This Is an Educational Tool, Not a Productivity Tool

**Previous assumption:** Contemplative journaling for adults
**Actual vision:** Handwriting literacy + AI tutoring for children and students

---

## Target Users

### Primary: Children (with parent guidance)
- Parents want kids to practice handwriting
- Slow down, draw, doodle, think deliberately
- Learn to engage with AI thoughtfully, not get quick answers

### Secondary: Students (K-12, college)
- Write essays with AI guidance
- Practice thinking through writing
- Publish "clean" human-only work (hide AI assistance)
- Schools that require cursive for LLM access

### Tertiary: Teachers/Schools
- Institutions that want to preserve handwriting skills
- Need to see student work separate from AI help
- Want transparent AI (visible system prompts)

---

## The Five Real Values

### Value 1: **Handwriting as Human Experience**

**Core Belief:**
Handwriting is how humans experience ideas in an embodied, tactile way. It's not just a "thinking tool" - it's the PRIMARY way people (especially kids) should interact with AI.

**What This Means:**
- Both human AND AI write by hand (with actual strokes, not simulated)
- Handwriting is for HUMANS to experience
- Text is for COMPUTERS (search, share, technical infrastructure)
- Transcription is background infrastructure, not the point

**Attention Policies (VX):**
- **SENSATIONS** of pen on surface connecting brain to hand to idea
- **MOMENTS** when writing by hand makes learning feel real and memorable
- **EMBODIMENT** of ideas through physical gesture and motion
- **ARTIFACTS** of handwritten work that feel personal and authentic

**Experience Design (UX):**
- AI responses appear as handwritten strokes (not SVG simulation)
- Both human and AI writing look equally "hand-made"
- Pressure sensitivity, variation, imperfection in both
- Text transcription available but secondary (for sharing/search)

**Implementation (UI):**
- ✅ Pressure-sensitive input (DONE)
- ✅ Stroke data preservation (DONE)
- ❌ **AI stroke generation** (NOT DONE - currently fake SVG)
  - Need to generate actual stroke arrays: {x, y, pressure, timestamp}
  - Variability, imperfection, human-like timing
  - Render using same pipeline as human strokes

---

### Value 2: **Learning Through Deliberate Practice**

**Core Belief:**
Slowing down is pedagogically valuable. Kids learn better by writing than typing. AI should encourage deliberate thinking, not provide quick answers.

**What This Means:**
- Handwriting's slowness is a FEATURE for learning
- Drawing/doodling is part of cognitive development
- AI acts as patient tutor, not answer machine
- Questions are better than answers

**Attention Policies (VX):**
- **GROWTH** that comes from wrestling with ideas yourself
- **PATIENCE** from an AI that asks questions instead of giving answers
- **CURIOSITY** sparked by exploring ideas through drawing/writing
- **MASTERY** of skills through repeated practice (handwriting, thinking)

**Experience Design (UX):**
- AI responds with Socratic questions, not direct answers
- AI encourages drawing/diagramming to visualize problems
- Slow, patient tone (not urgent or efficiency-focused)
- System prompt tuned for "vizir" mode (wise counselor, not assistant)

**Implementation (UI):**
- ❌ **Update system prompt to vizir/tutor mode** (NOT DONE)
  - Current: Generic assistant
  - Needed: Socratic questioning, patient exploration
  - Example: "What do you think would happen if...?" not "The answer is..."
- ❌ **Make system prompt visible in settings** (NOT DONE)
  - Users (parents, teachers, students) should see how AI is instructed
  - Transparency builds trust and understanding

---

### Value 3: **Educational Integrity**

**Core Belief:**
Students should be able to use AI to LEARN, but show their OWN THINKING when publishing work. This isn't cheating - it's like showing your work in math class.

**What This Means:**
- AI can help develop ideas (tutoring, brainstorming)
- But final work should distinguish human from AI contributions
- Students can export "clean" notebooks with only human writing
- Teachers/parents can see what student actually created vs. AI help

**Attention Policies (VX):**
- **PRIDE** in showing your own thinking and work
- **HONESTY** about when you got help and when you worked alone
- **LEARNING** through AI guidance without it doing the work for you
- **INTEGRITY** of showing human creativity separate from AI assistance

**Experience Design (UX):**
- Toggle to hide/show AI responses (layer visibility)
- Export options: "Full notebook" vs. "Human work only"
- Visual distinction between human and AI strokes (color, label, layer)
- Teachers can request "no AI view" to assess student work

**Implementation (UI):**
- ❌ **Add "Show AI Responses" toggle** (NOT DONE)
  - Layer control: human strokes always visible, AI strokes toggle on/off
  - Persists across sessions (user preference)
  - Clear visual indicator when AI is hidden

- ❌ **Export with AI inclusion option** (NOT DONE)
  - PDF export: "Include AI responses?" checkbox
  - JSON export: separate human vs. AI stroke arrays
  - Shareable URLs: option to share with/without AI

- ❌ **Visual distinction for AI strokes** (NOT DONE)
  - Different color? (e.g., AI in blue, human in black?)
  - Or label: "Claude's response" vs. "Your writing"
  - Subtle but clear when both are visible

---

### Value 4: **Transparent AI (The Vizir)**

**Core Belief:**
AI should be a wise counselor (vizir), not a black box. Users should understand how the AI thinks, see the system prompt, and participate in making it better.

**What This Means:**
- System prompt is visible, not hidden in code
- AI positioned as "convivial technology" (Ivan Illich) - empowering, not dependency-creating
- Continuously refined based on usage (with user consent)
- Users can suggest improvements to system prompt

**Attention Policies (VX):**
- **UNDERSTANDING** of how AI is instructed and why
- **AGENCY** in shaping how AI responds (visible, editable prompt)
- **WISDOM** from an AI that guides rather than dictates
- **EMPOWERMENT** to think better, not dependence on AI thinking for you

**Experience Design (UX):**
- Settings page with collapsible system prompt view
- Plain language explanation: "Here's how we instruct Claude to respond"
- Option to suggest improvements (feedback form)
- Version history of prompt changes (transparency)

**Implementation (UI):**
- ❌ **System prompt visible in settings** (NOT DONE)
  - New settings section: "How Claude Responds"
  - Show current system prompt with explanation
  - "Why this matters" educational content

- ❌ **Update system prompt to vizir/tutor mode** (NOT DONE)
  - Current prompt is generic assistant
  - New prompt emphasizes:
    - Ask Socratic questions
    - Encourage drawing/visualizing
    - Patient, exploratory tone
    - Don't give answers, help discover them
    - Example prompt snippet:
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

- ❌ **Prompt refinement system** (NOT DONE - future)
  - Aggregate anonymous data about prompt effectiveness
  - A/B test prompt variations
  - Show users: "We recently improved how Claude responds - here's what changed"

---

### Value 5: **Handwriting Literacy**

**Core Belief:**
Handwriting is not obsolete. It's a valuable skill for cognitive development, learning, and human expression. Cursive should be a legitimate interface for AI, not just typing.

**What This Means:**
- Schools can require cursive as the only LLM interface
- Legitimizes handwriting as serious, not "cute" or "nostalgic"
- Drawing/doodling are valid forms of thinking, not distractions
- AI meets students in their handwriting, not forcing them to type

**Attention Policies (VX):**
- **RESPECT** for handwriting as skill and practice
- **LEGITIMACY** of cursive as proper way to engage with AI
- **CREATIVITY** through drawing, doodling, visual thinking
- **DEVELOPMENT** of fine motor skills and hand-brain connection

**Experience Design (UX):**
- Handwriting gets EQUAL or BETTER AI access than typing
- Cursive detection and transcription quality
- Encourages drawing (not just text) as input
- AI responds to drawings/diagrams with understanding

**Implementation (UI):**
- ✅ Pressure-sensitive drawing (DONE)
- ✅ Palm rejection (DONE)
- ✅ OCR via Claude Vision (DONE)
- ✅ Streaming AI responses (DONE)
- ❌ **Drawing/diagram understanding** (PARTIAL)
  - Currently transcribes handwritten text well
  - Should also understand diagrams, sketches, visual notes
  - AI should respond to visual thinking, not just text

---

## Value 6: **Convivial Technology**

**Core Belief:**
Tools should empower users to be more capable, not create dependency. (Ivan Illich's "conviviality")

**What This Means:**
- AI helps you think better, doesn't think FOR you
- You become better at thinking/writing, not dependent on AI
- Slow and deep is as valid as fast and broad
- Tool respects your learning pace

**Attention Policies (VX):**
- **CAPABILITY** growing over time through practice
- **INDEPENDENCE** from always needing AI help
- **CONFIDENCE** in your own thinking
- **SKILLS** developing through deliberate use

**Experience Design (UX):**
- AI encourages trying before asking for help
- "Try drawing it out first" prompts
- Celebrates student's ideas before adding AI perspective
- Gradual scaffolding (more help early, less over time)

**Implementation (UI):**
- ❌ **Scaffolding system** (NOT DONE - future)
  - Track user progress over time
  - Gradually reduce AI prompting as skills develop
  - "You've gotten better at X!" feedback

- ❌ **Try-first prompts** (NOT DONE)
  - Before transcribing, suggest: "Try solving this yourself first!"
  - Optional "I'm stuck" mode vs. "Let me explore" mode

---

## Must Haves (Non-Negotiable)

### Already Implemented ✅
1. ✅ Pressure-sensitive handwriting input
2. ✅ Stroke data preservation with pressure
3. ✅ Palm rejection for stylus
4. ✅ OCR via Claude Vision
5. ✅ Private by default (RLS policies)
6. ✅ BYOK option (bring your own API key)
7. ✅ Graceful degradation (offline mode)

### Must Implement ❌
8. ❌ **AI writes with actual strokes** (not SVG simulation)
9. ❌ **Hide/show AI responses toggle** (for publishing clean work)
10. ❌ **Export human-only notebooks** (PDF/JSON without AI)
11. ❌ **System prompt visible in settings**
12. ❌ **Vizir/tutor-mode system prompt** (Socratic, patient)
13. ❌ **Visual distinction between human and AI strokes**
14. ❌ **Kid-friendly onboarding**

---

## Must NOT Haves (Values Violations)

### Already Correct ✅
1. ✅ No auto-transcription (user must select)
2. ✅ No social features (likes, followers)
3. ✅ No gamification (streaks, points, badges)
4. ✅ No "engagement" optimization
5. ✅ No notifications or urgency

### Must Avoid ❌
6. ❌ **AI that gives quick answers without encouraging thinking**
   - Violates "Learning Through Deliberate Practice"
   - Current risk: Generic assistant prompt might do this

7. ❌ **Hidden system prompt** (must be transparent)
   - Violates "Transparent AI"
   - Currently violated: prompt is buried in code

8. ❌ **No way to publish clean human-only work**
   - Violates "Educational Integrity"
   - Currently violated: can't hide AI responses

9. ❌ **Adult-only positioning**
   - Violates "Handwriting Literacy" focus on kids
   - Currently violated: README targets adult users

10. ❌ **Fake-looking AI handwriting** (SVG simulation)
    - Violates "Handwriting as Human Experience"
    - Currently violated: AI uses SVG paths, not strokes

---

## User Scenarios (Actual Use Cases)

### Scenario 1: 8-Year-Old Practicing Math

**Context:** Emma's parent wants her to practice multiplication but also have access to AI help.

**Journey:**
1. Opens Cursive on iPad, sees kid-friendly interface
2. Writes out math problem by hand: "7 × 8 = ?"
3. Tries to solve it herself, writes "54?"
4. Selects her work, asks Claude: "Is this right?"
5. Claude responds BY HAND: "Let me ask you - if 7 × 7 = 49, what would one more 7 be?"
6. Emma writes: "49 + 7 = 56!"
7. Claude writes: "Exactly! Want to try 7 × 9 next?"

**Values Activated:**
- ✅ Handwriting as Human Experience (AI writes by hand)
- ✅ Learning Through Deliberate Practice (Socratic question, not answer)
- ✅ Transparent AI (parent can see system prompt in settings)
- ✅ Convivial Technology (Emma is learning, not depending)

**What's Missing Today:**
- ❌ AI doesn't write with strokes (uses SVG)
- ❌ System prompt not kid-optimized
- ❌ No kid-friendly onboarding

---

### Scenario 2: High School Student Writing Essay

**Context:** Jake is writing an essay on climate change. Needs to show teacher it's his own work.

**Journey:**
1. Opens Cursive, starts writing outline by hand
2. Selects rough outline, asks Claude: "What am I missing?"
3. Claude responds BY HAND: "Strong start! I notice you mention causes but not solutions. What solutions have you researched?"
4. Jake writes more ideas, back and forth with Claude
5. Develops full essay draft with AI guidance visible on canvas
6. When ready to submit: **toggles "Hide AI responses"**
7. Exports PDF with ONLY Jake's handwriting visible
8. Teacher sees Jake's complete thinking process, minus AI assistance

**Values Activated:**
- ✅ Educational Integrity (can show clean human-only work)
- ✅ Handwriting as Human Experience (essay written by hand)
- ✅ Learning Through Deliberate Practice (AI guides, doesn't write)
- ✅ Transparent AI (teacher knows tool exists, trusts the process)

**What's Missing Today:**
- ❌ No "hide AI responses" toggle
- ❌ No human-only export option
- ❌ No visual distinction between Jake and Claude's writing
- ❌ No essay-writing workflow documentation

---

### Scenario 3: School Adopts Cursive-Only LLM Policy

**Context:** School district wants to allow LLM use but preserve handwriting skills.

**Journey:**
1. School policy: "Students may use Cursive for AI assistance. Typed LLM use is prohibited."
2. Teachers receive training on Cursive's transparent AI approach
3. System prompt is reviewed by curriculum committee (it's visible!)
4. Students use Cursive for homework, projects, brainstorming
5. Teachers can request "human-only view" to assess student work
6. School tracks: handwriting skills IMPROVE while still getting AI benefits

**Values Activated:**
- ✅ Handwriting Literacy (cursive as legitimate LLM interface)
- ✅ Educational Integrity (clean student work can be assessed)
- ✅ Transparent AI (school can review and approve system prompt)
- ✅ Learning Through Deliberate Practice (slowness is pedagogical)

**What's Missing Today:**
- ❌ No teacher dashboard/features
- ❌ No institutional documentation
- ❌ No "school use" positioning in marketing

---

## Anti-Patterns (What Would Violate Values)

### ❌ "Homework Helper" Mode
"AI completes your homework for you!"
- **Violates:** Educational Integrity, Learning Through Deliberate Practice
- **Why:** Creates dependency, enables cheating, doesn't teach

### ❌ Typing Interface
"Type faster! Handwriting is slow and inefficient!"
- **Violates:** Handwriting Literacy, Learning Through Deliberate Practice
- **Why:** Slowness is pedagogically valuable, handwriting is the point

### ❌ Hidden System Prompt
"Our AI is tuned just right - trust us!"
- **Violates:** Transparent AI
- **Why:** Parents/teachers/students deserve to see how AI is instructed

### ❌ No Clean Export
"All work exported includes AI responses, always"
- **Violates:** Educational Integrity
- **Why:** Students can't show their own work separately from AI help

### ❌ Quick Answer Mode
"Get instant answers to any question!"
- **Violates:** Learning Through Deliberate Practice, Convivial Technology
- **Why:** Encourages dependency, not learning

### ❌ Social Comparison
"See how your essay compares to classmates!"
- **Violates:** All values
- **Why:** Creates anxiety, competition, surveillance

---

## Implementation Priorities

### Phase 1: Critical Values Alignment (Next 2 Weeks)

**Priority 1: Educational Integrity Features**
1. Add "Show/Hide AI Responses" toggle
   - Layer visibility control
   - Persists across sessions
   - Clear visual indicator

2. Export human-only notebooks
   - PDF export with "Include AI?" checkbox
   - JSON export with separate stroke arrays
   - Shareable URLs with AI inclusion option

3. Visual distinction for AI strokes
   - Different color or label for AI vs. human
   - Clear but subtle (not distracting)

**Priority 2: Transparent AI**
4. Make system prompt visible in settings
   - New settings section: "How Claude Responds"
   - Plain language explanation
   - "Why this matters" for parents/teachers

5. Update system prompt to vizir/tutor mode
   - Socratic questioning
   - Patient, exploratory tone
   - Encourage drawing/visualizing
   - Don't give answers, help discover them

**Priority 3: Documentation**
6. Update README for educational use cases
   - Target users: kids, students, schools
   - Essay writing workflow
   - "Clean notebook" publishing
   - Parent/teacher guidance

7. Create education-focused landing page content

---

### Phase 2: AI Stroke Generation (Hard - Research Phase)

**This is technically challenging and will take time.**

**Research Questions:**
- How to generate convincing handwritten strokes (not SVG)?
- What makes handwriting look "real" vs. "robotic"?
- Timing, pressure variation, imperfection, individual character variation

**Possible Approaches:**
1. **Procedural generation**
   - Algorithm that creates stroke arrays with realistic variation
   - Pressure curves, timing, spacing
   - Character-level variation

2. **Trained model**
   - Fine-tune on handwriting datasets
   - Generate stroke sequences, not images
   - Expensive, complex

3. **Hybrid**
   - Use existing handwriting fonts as "skeletons"
   - Add procedural variation (jitter, pressure, timing)
   - Simpler than full ML approach

**Implementation:**
8. Research + prototype stroke generation
9. Integrate with AI response pipeline
10. Test with kids/students for realism

---

### Phase 3: Educational Features (After Core Values)

11. Kid-friendly onboarding
    - Simpler language
    - Parent guidance mode
    - "Try it out" interactive tutorial

12. Essay writing templates
    - Outline structures
    - Brainstorming frameworks
    - Thesis development guides

13. Teacher features (future)
    - Class notebooks?
    - Assignment templates?
    - Student progress (with consent)?

---

## Questions for Refinement

1. **AI Stroke Generation Priority:**
   Is this Phase 1 or Phase 2? It's core to "Handwriting as Human Experience" but technically hard.

2. **Data for Prompt Refinement:**
   You mentioned gathering data to improve system prompt. What data? How to balance with privacy?

3. **Visual Distinction:**
   Should AI strokes be different color? Or just labeled? What feels right pedagogically?

4. **Age Range:**
   Primary focus on which ages? K-5? Middle school? High school? All?

5. **School Features:**
   Do you want teacher dashboards, class management, etc.? Or keep it simple?

---

## Success Metrics (Aligned with Values)

### Education-Focused Metrics:

1. **Handwriting improvement** (if trackable with consent)
   - Are kids' handwriting skills developing?

2. **Thoughtful AI use** (qualitative)
   - Are students using AI to learn, not just get answers?
   - Survey parents/teachers

3. **Clean notebook usage**
   - % of students using "hide AI" feature
   - Indicates educational integrity in practice

4. **System prompt transparency**
   - % of users who view system prompt
   - Indicates trust and engagement

5. **Retention over time**
   - Do students keep using Cursive as learning tool?
   - Not addiction, but genuine value

### NOT Success Metrics:
- ❌ Time on site (not the goal)
- ❌ Number of AI queries (not optimizing for use)
- ❌ Daily active users (no pressure to use daily)
- ❌ Feature adoption rates (no pushing features)

---

## Next Steps

1. Review this document - is this accurate?
2. Answer the 5 questions above
3. Prioritize Phase 1 implementation
4. Decide on AI stroke generation timeline
5. Update all documentation (README, landing page, etc.)

---

**This is the REAL Cursive.**

Not a productivity tool for adults.
Not a journaling app.
Not a note-taking replacement.

**Cursive is a handwriting literacy tool that lets kids and students learn with AI as a patient tutor, not a homework machine.**

---

End of Real Values Document.
