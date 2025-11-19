# Cursive ✍️

**An educational handwriting tool where children and students learn with AI as a patient tutor**

Cursive is not a productivity app for adults. It's a deliberate learning tool where kids write by hand on a digital canvas, and Claude AI responds—teaching through questions, not answers.

<img width="759" alt="Cursive Screenshot" src="https://github.com/bilalghalib/Cursive/assets/3254792/41829109-9f4a-406a-b3a1-68be6b4d5b96">

---

## 🎯 Who Is This For?

### Primary Users
- **Students (K-12, college)** - Write essays, solve problems, take notes with AI guidance
- **Children (with parent guidance)** - Practice handwriting while learning deliberately
- **Teachers** - Assign work that preserves handwriting skills while allowing AI assistance

### Core Value Proposition

> **What if AI could teach kids to think, not just give them answers?**

Cursive respects the **slowness of handwriting as pedagogically valuable**. Writing by hand makes you think deliberately. Our AI acts as a Socratic tutor—asking questions, suggesting you draw diagrams, celebrating your thinking process—not a homework machine.

---

## ✨ Key Features

### Educational Integrity
- ✅ **"Student Mode" Toggle** - Hide AI responses to export clean work for teachers
- ✅ **Visual Distinction** - AI writes in purple-blue, students in black (always clear who wrote what)
- ✅ **Socratic AI Tutor** - AI asks guiding questions instead of giving direct answers
- ✅ **Export Clean Work** - PDF/JSON export with option to exclude AI assistance

### Canvas & Drawing
- ✍️ **Pressure-sensitive handwriting** with palm rejection (iPad, Surface, etc.)
- 🎨 **Infinite canvas** with pan, zoom, undo/redo
- 🖼️ **Selection tool** to capture handwriting for OCR
- 🌓 **Dark/light themes**

### AI Interaction
- 🤖 **Handwriting OCR** via Claude Vision API
- 💬 **Conversational AI** with streaming responses
- 🧠 **Tutor-mode prompt** - Encourages exploration, not quick answers
- 📝 **On-canvas responses** - AI writes directly on your canvas

### Data & Privacy
- 🔐 **Supabase Auth** with Row Level Security (RLS)
- 💾 **PostgreSQL database** for notebooks and drawings
- 🔑 **BYOK support** - Bring Your Own API Key option
- 🚫 **No social features** - No likes, followers, streaks, or engagement optimization

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- [Supabase account](https://supabase.com) (free tier works)
- [Anthropic API key](https://console.anthropic.com/) (optional if using BYOK)

### Development Setup

```bash
# 1. Clone repository
git clone https://github.com/bilalghalib/Cursive.git
cd Cursive

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# Edit .env.local with your credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# ANTHROPIC_API_KEY=sk-ant-your-key (optional)

# 4. Set up Supabase database
# - Copy contents of database/UNIFIED_SCHEMA.sql
# - Paste into Supabase Dashboard > SQL Editor > Run
# - Enable Email Auth in Authentication > Providers

# 5. Run development server
npm run dev

# 6. Open http://localhost:3000
```

See [SETUP.md](./SETUP.md) for detailed deployment instructions.

---

## 📖 How It Works

### For Students

1. **Draw/Write** - Use the pencil tool to write by hand (works best with stylus)
2. **Select Your Work** - Drag a box around what you want to discuss with AI
3. **Get Socratic Guidance** - AI asks questions to help you discover answers yourself
4. **Toggle Student Mode** - Hide AI responses to export clean work for teachers
5. **Export** - Save as PDF with only your handwriting visible

### Example Interaction

**Student writes:** "7 × 8 = 54?"

**Old AI (generic assistant):** "7 × 8 = 56"

**Cursive AI (Socratic tutor):** "Good attempt! If 7 × 7 = 49, what would one more group of 7 be? Can you draw it out?"

---

## 🎓 Educational Philosophy

Cursive is built on five core values (see [REAL_VALUES.md](./REAL_VALUES.md)):

### 1. Handwriting as Human Experience
Both student AND AI write with actual strokes, not typed text. Handwriting is how humans experience ideas.

### 2. Learning Through Deliberate Practice
The slowness of handwriting is a feature. AI acts as patient tutor, not answer machine.

### 3. Educational Integrity
Students can export "human-only" work separate from AI help. Teachers see clean student thinking.

### 4. Transparent AI
System prompt is visible. Parents/teachers can see how AI is instructed. No black boxes.

### 5. Handwriting Literacy
Cursive/handwriting is a legitimate way to engage with AI, not just typing.

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 18 + TypeScript
- Tailwind CSS 4
- perfect-freehand (pressure-sensitive drawing)

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Edge Functions (Claude API proxy)
- Row Level Security (RLS) policies

**AI:**
- Anthropic Claude (Sonnet 4.5)
- Vision API for OCR
- Streaming responses

### Database Schema

```
Tables:
├── notebooks           # Collections of drawings (private by default)
├── drawings            # Stroke data with is_ai_generated flag
├── user_handwriting    # Training samples for AI mimicry
├── api_usage           # Token tracking for billing
└── user_settings       # Preferences, BYOK keys, hide_ai_responses

All tables use UUID and reference auth.users(id) from Supabase Auth.
Protected by Row Level Security (RLS).
```

See [database/SCHEMA_README.md](./database/SCHEMA_README.md) for complete documentation.

---

## 🎯 What's Implemented

### ✅ Core Canvas (Complete)
- Pressure-sensitive drawing with palm rejection
- Infinite canvas with pan/zoom
- Undo/redo with history stack
- Selection tool
- Export to PDF/JSON

### ✅ AI Integration (Complete)
- OCR via Claude Vision API
- Streaming AI responses
- **Socratic tutor-mode system prompt** 🆕
- On-canvas text overlays

### ✅ Educational Features (Complete)
- **"Student Mode" toggle** - Hide AI responses 🆕
- **Visual distinction** - AI in indigo, student in black 🆕
- Tutor-mode AI (asks questions, not answers) 🆕
- Export with/without AI option 🆕

### ✅ Infrastructure (Complete)
- Supabase authentication (email/password)
- PostgreSQL database with RLS
- Auth UI components (login/signup)
- User menu with logout
- API usage tracking

### ❌ What's Missing
- System prompt visibility UI (backend ready, no settings page)
- AI stroke generation (currently uses SVG fonts, not actual strokes)
- Handwriting training UI (types exist, implementation pending)
- Plugin system migration (calculator, OCR, shapes from legacy app)
- Kid-friendly onboarding flow

---

## 📚 Documentation

- **[REAL_VALUES.md](./REAL_VALUES.md)** - Core values, user scenarios, implementation priorities
- **[CLAUDE.md](./CLAUDE.md)** - Architecture, development guidelines, file structure
- **[SETUP.md](./SETUP.md)** - Detailed deployment and configuration guide
- **[database/SCHEMA_README.md](./database/SCHEMA_README.md)** - Database schema documentation
- **[VX_AUDIT_REPORT.md](./VX_AUDIT_REPORT.md)** - Values-through-code audit

---

## 🚫 What Cursive Is NOT

❌ **Not a productivity tool for adults** - Built for kids/students learning
❌ **Not a homework machine** - AI guides, doesn't provide answers
❌ **Not gamified** - No points, badges, streaks, or social features
❌ **Not engagement-optimized** - No notifications, dark patterns, or addiction mechanics
❌ **Not a typing interface** - Handwriting is the primary input method

---

## 🤝 Contributing

We welcome contributions that align with Cursive's educational values!

### Priority Areas
1. **Educational features** - Kid-friendly UI, teacher dashboards, school workflows
2. **AI stroke generation** - Make AI write with actual strokes, not SVG fonts
3. **System prompt transparency** - Settings page to view/understand AI instructions
4. **Testing** - Unit and integration tests for educational features
5. **Documentation** - Guides for parents, teachers, students

### Development Guidelines

See [CLAUDE.md](./CLAUDE.md) for:
- Code style and structure
- TypeScript interfaces
- Anti-patterns to avoid
- Educational design principles

---

## 📜 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 🙏 Acknowledgments

- Built with [Anthropic's Claude API](https://www.anthropic.com/api)
- Handwriting rendering via [perfect-freehand](https://github.com/steveruizok/perfect-freehand)
- Database and auth via [Supabase](https://supabase.com)
- Inspired by Ivan Illich's concept of "convivial technology"

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/bilalghalib/Cursive/issues)
- **Documentation:** See [CLAUDE.md](./CLAUDE.md) and [REAL_VALUES.md](./REAL_VALUES.md)
- **Questions:** [GitHub Discussions](https://github.com/bilalghalib/Cursive/discussions)

---

## 🎯 Use Cases

### For Students
- **Essay writing** with AI guidance (export clean version for teachers)
- **Math practice** with Socratic questioning
- **Note-taking** on digital canvas with AI conversation
- **Homework** where AI helps discover answers, not provide them

### For Parents
- **Handwriting practice** for kids with patient AI tutor
- **Visible system prompt** to understand how AI teaches
- **Safe environment** with no social features or engagement tricks

### For Teachers
- **Assignments** that allow AI help but show student thinking
- **Cursive requirement** for LLM access (preserves handwriting literacy)
- **Clean exports** to see student work without AI responses

### For Schools
- **Handwriting + AI** policy that preserves deliberate learning
- **Transparent AI** that parents and administrators can review
- **Educational integrity** with clear separation of student vs. AI work

---

**Remember:** Cursive is a learning tool, not an efficiency tool. Every feature serves deliberate practice, not productivity.
