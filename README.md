# Cursive

**An AI-powered digital notebook that writes back**

What if you could write longhand in your journal, and your journal wrote back?

> *A new page is turned*
> *Hear ideas echoing*
> *Across the wire*

<img width="759" alt="Screenshot 2024-06-27 at 22 06 22" src="https://github.com/bilalghalib/Cursive/assets/3254792/41829109-9f4a-406a-b3a1-68be6b4d5b96">

---

## 📖 What is Cursive?

Cursive is an intelligent digital canvas that combines natural handwriting input with Claude AI's conversational abilities. It's designed for tablets with stylus support (iPad, Surface, etc.) and offers a unique "analog journaling meets AI" experience.

### Core Features

- ✍️ **Pressure-sensitive drawing** with palm rejection for natural writing
- 🤖 **AI-powered OCR** - select handwritten areas to transcribe via Claude's vision API
- 💬 **Conversational AI** - chat with Claude about your notes, with responses in simulated handwriting
- 🎨 **Infinite canvas** with pan, zoom, undo/redo
- 🌓 **Dark/light themes** optimized for both modes
- 📤 **Multiple export options** - PDF, JSON, or shareable web URLs
- 🔌 **Plugin system** - calculator, OCR, shapes, templates, color picker

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/bilalghalib/Cursive.git
   cd Cursive
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure API key**

   Create a `.env` file in the root directory:
   ```env
   CLAUDE_API_KEY=your_anthropic_api_key_here
   ```

4. **Run the development server**
   ```bash
   python proxy.py
   ```

5. **Open in browser**

   Navigate to `http://localhost:5022/`

### Production Deployment

For production, use Gunicorn with WSGI:

```bash
gunicorn wsgi:app --bind 0.0.0.0:5022 --workers 4
```

---

## 🎯 How to Use

1. **Draw** - Use the pencil tool to write or draw on the canvas (works best with stylus)
2. **Select** - Click the selection tool and drag a box around handwritten text
3. **Chat** - Selected text is transcribed and sent to Claude; responses appear in handwriting-style fonts
4. **Export** - Save your work as PDF, JSON, or generate a shareable web link
5. **Customize** - Install plugins for extended functionality

---

## 📊 Project Status

**Current Version:** `2.0` (Beta - Phase 1 & 2 Complete!)
**Status:** Production-ready with authentication, database, and billing infrastructure

### ✅ What Works Well

- ✅ **Core handwriting-to-AI pipeline** - Pressure-sensitive drawing with Claude Vision OCR
- ✅ **User authentication** - Flask-Login + JWT with secure session management
- ✅ **Database & sync** - Supabase (PostgreSQL) with Row Level Security policies
- ✅ **Rate limiting** - Redis-based (50/min, 500/day with configurable tiers)
- ✅ **Billing system** - Stripe integration with transparent token tracking
- ✅ **BYOK support** - Users can bring their own Anthropic API keys
- ✅ **Security** - Fixed CORS, input validation, encrypted API key storage
- ✅ **Streaming AI responses** - Simulated handwriting with multiple styles
- ✅ **Export functionality** - PDF, JSON, and shareable web URLs
- ✅ **Plugin architecture** - 5 built-in plugins (calculator, OCR, shapes, templates, colors)
- ✅ **Real-time collaboration** - Multi-user editing with Supabase real-time (beta)

### ⚠️ Known Improvements Needed

- **Code organization** - Large monolithic files (app.js: 1800+ lines, canvasManager.js: 1600+ lines)
- **Testing** - No automated tests yet (manual testing only)
- **TypeScript** - Currently vanilla JavaScript (no type safety)
- **Mobile app** - Web-only (tablet browsers supported, native app planned)
- **Documentation** - Some features documented in CLAUDE.md but not README

---

## 🏗️ Architecture

### Backend (Python/Flask)

- **proxy.py** - Main Flask app with authentication, rate limiting, billing
- **auth.py** - User registration, login, JWT token management
- **billing.py** - Stripe integration, usage tracking, subscription management
- **rate_limiter.py** - Redis-based distributed rate limiting
- **database.py** - Database connection and initialization
- **models.py** - SQLAlchemy models (User, Notebook, Drawing, API Usage, Billing)
- **api_routes.py** - REST API for notebooks and drawings
- **wsgi.py** - Production WSGI entry point

### Frontend (Vanilla JS)

```
static/js/
├── app.js                      # Main application logic (1800+ lines)
├── canvasManager.js            # Canvas drawing, pan/zoom, selection (1600+ lines)
├── aiService.js                # Claude API communication
├── dataManager.js              # Supabase + localStorage persistence
├── authService.js              # Authentication (login, signup, session)
├── sharingService.js           # Notebook sharing via Supabase
├── collaborationService.js     # Real-time collaboration (beta)
├── handwritingSimulation.js    # Simulated handwriting rendering
├── pluginManager.js            # Plugin system
└── plugins/                    # Built-in plugins (5 total)
```

### Database (Supabase / PostgreSQL)

```
Tables:
├── users                  # Authentication, API keys, subscription tier
├── notebooks              # Collections of drawings (private by default)
├── drawings               # Canvas data with stroke_data (pressure-sensitive)
├── api_usage              # Token tracking for billing (input/output/cost)
└── billing                # Stripe customer/subscription management

All tables protected by Row Level Security (RLS) policies.
```

### Data Flow

1. User draws on canvas → stored with pressure data
2. User selects area → captured as image
3. Image sent to Claude Vision API → transcription
4. Transcription sent to Claude Chat API → streaming response
5. Response rendered in simulated handwriting (temporary modal)
6. User chooses to "Etch to Canvas" (permanent) or dismiss
7. All saved to Supabase (with localStorage fallback for offline)

---

## 🔧 Modernization Roadmap

To launch this application publicly with monetization, here are the recommended next steps:

### ✅ Phase 1: Security & User Management (COMPLETED)

**Status:** ✅ **COMPLETE** - All items implemented

- ✅ User authentication (email/password with password strength validation)
- ✅ API key management per user (BYOK - Bring Your Own Key with encryption)
- ✅ Billing system for API usage tracking
  - ✅ Stripe integration for 15% markup model
  - ✅ Usage metering (token counting: input/output/cost)
  - ✅ Subscription tiers (Free/Pro/Enterprise)
- ✅ Rate limiting (50/minute, 500/day per user via Redis)
- ✅ Input sanitization (Marshmallow schemas for validation)
- ✅ CORS security (specific origins only, no wildcard)
- ✅ CSRF protection (secure session cookies)
- ✅ Secure session management (Flask-Session with Redis/filesystem)

### ✅ Phase 2: Database & Scalability (COMPLETED)

**Status:** ✅ **COMPLETE** - Migrated to Supabase

- ✅ Migrated from localStorage to Supabase (PostgreSQL)
  - ✅ Users table (authentication, API keys, subscription tier)
  - ✅ Notebooks table (collections of drawings)
  - ✅ Drawings table (stroke data, transcriptions, AI responses)
  - ✅ API Usage table (token tracking for billing)
  - ✅ Billing table (Stripe customer/subscription data)
- ✅ Backend storage for drawings (Supabase with RLS policies)
- ✅ Real-time sync via Supabase (with localStorage fallback)
- ✅ Redis for session management (with filesystem fallback)
- ✅ Row Level Security (RLS) policies on all tables
- ✅ Graceful degradation (works offline, syncs when online)

### Phase 3: Code Quality & Maintainability

**Priority: MEDIUM** - Improves development velocity

- [ ] Migrate to TypeScript for type safety
- [ ] Set up build system (Vite recommended)
- [ ] Break down monolithic files into smaller modules
  - [ ] Refactor app.js (1800 lines → multiple files)
  - [ ] Refactor canvasManager.js (1600 lines → multiple files)
- [ ] Add unit tests (Jest, Vitest)
- [ ] Add integration tests (Playwright, Cypress)
- [ ] Set up ESLint + Prettier
- [ ] Remove dead code and magic numbers
- [ ] Implement proper error boundaries
- [ ] Add comprehensive logging

### Phase 4: DevOps & Monitoring

**Priority: MEDIUM** - Required for production reliability

- [ ] Set up CI/CD pipeline (GitHub Actions, CircleCI)
- [ ] Add error tracking (Sentry, Rollbar)
- [ ] Implement application monitoring (Datadog, New Relic)
- [ ] Set up log aggregation (ELK stack, CloudWatch)
- [ ] Create staging environment
- [ ] Add health check endpoints
- [ ] Implement automated backups
- [ ] Set up alerting for errors and usage spikes

### Phase 5: Features & UX Improvements

**Priority: LOW** - Nice-to-haves after core issues resolved

- [ ] Mobile app (React Native, Flutter)
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced plugin marketplace
- [ ] Cloud sync across devices
- [ ] AI model selection (Claude 3.5 Sonnet, Opus, etc.)
- [ ] Custom handwriting fonts
- [ ] OCR improvements for non-English languages
- [ ] Voice-to-text integration
- [ ] Template marketplace

---

## 💰 Monetization Strategy

Based on your requirements, here's the recommended approach:

### Option 1: BYOK (Bring Your Own Key)

**Users provide their own Anthropic API key**

**Pros:**
- No API costs for you
- Simple implementation
- No usage tracking needed
- No billing complexity

**Cons:**
- Limits user base (requires technical knowledge)
- No recurring revenue

**Implementation:**
- Add API key input field in settings
- Store encrypted key in user's account
- Use their key for API calls

### Option 2: Subscription + 15% Fee

**You provide API access, charge subscription + markup**

**Pros:**
- Recurring revenue stream
- Better UX (no API key setup)
- Larger potential user base

**Cons:**
- You pay API costs upfront
- Requires complex billing system
- Need accurate usage tracking
- Risk of abuse without proper limits

**Implementation:**
- Integrate Stripe for payments
- Track API usage per user in database
- Calculate costs: `(Anthropic cost × 1.15) + subscription fee`
- Set usage quotas per tier

### Recommended: Hybrid Model

**Offer both options:**

- **Free Tier:** BYOK only, limited features
- **Pro Tier ($9/month):** 50k tokens included, $0.02/1k tokens after (15% markup)
- **Enterprise:** Custom pricing with dedicated support

This gives users choice while maximizing revenue potential.

---

## 🔐 Critical Security Issues (Must Fix Before Launch)

1. **API Key Exposure Risk**
   - Current: Single server-side key for all users
   - Fix: Per-user API key storage with encryption

2. **No Rate Limiting**
   - Current: Unlimited API calls
   - Fix: Implement Redis-based rate limiter (50 requests/minute per user)

3. **CORS Wildcard**
   - Location: `proxy.py:97, 121`
   - Fix: Replace `Access-Control-Allow-Origin: *` with specific domain

4. **Input Sanitization**
   - Current: User inputs sent directly to API without validation
   - Fix: Add input validation, length limits, and sanitization

5. **No Authentication**
   - Current: Anyone can access `/api/claude` endpoint
   - Fix: Require JWT tokens for all API requests

---

## 🛠️ Tech Stack

### Current

- **Backend:** Flask, Gunicorn, python-dotenv, anthropic-sdk
- **Frontend:** Vanilla JavaScript (ES6 modules), HTML5 Canvas
- **Storage:** LocalStorage, file system (pages/)
- **AI:** Anthropic Claude API (Vision + Chat)
- **Export:** jsPDF, FileSaver.js
- **Config:** YAML (js-yaml)

### Recommended Additions

- **Database:** PostgreSQL (user data, notebooks) + Redis (cache, sessions)
- **Auth:** Auth0 or NextAuth.js
- **Payments:** Stripe
- **Monitoring:** Sentry (errors) + Datadog (metrics)
- **Build:** Vite
- **Testing:** Vitest + Playwright
- **CDN:** Cloudflare

---

## 📁 Project Structure

```
Cursive/
├── proxy.py              # Flask backend
├── wsgi.py              # Production WSGI
├── requirements.txt     # Python dependencies
├── .env                 # API keys (not in git)
├── static/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js                    # Main app
│   │   ├── canvasManager.js          # Canvas logic
│   │   ├── aiService.js              # API calls
│   │   ├── dataManager.js            # Storage
│   │   ├── handwritingSimulation.js  # Font rendering
│   │   ├── pluginManager.js          # Plugin system
│   │   └── plugins/                  # Built-in plugins
│   └── config/
│       └── config.yaml
├── templates/
│   └── index.html       # Main page
└── pages/               # User-generated shareable pages
```

---

## 🤝 Contributing

Contributions welcome! Priority areas:

1. Security improvements
2. Test coverage
3. TypeScript migration
4. Documentation
5. Bug fixes

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and test thoroughly
4. Commit with clear messages (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📜 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- Built with [Anthropic's Claude API](https://www.anthropic.com/api)
- Handwriting fonts from Google Fonts
- Icons by Font Awesome

---

## 📞 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/bilalghalib/Cursive/issues)
- **Discussions:** [GitHub Discussions](https://github.com/bilalghalib/Cursive/discussions)

---

**⚠️ Pre-Launch Checklist**

Before deploying to production:

- [ ] Implement user authentication
- [ ] Add rate limiting
- [ ] Set up database
- [ ] Integrate payment system
- [ ] Fix all security issues
- [ ] Add monitoring and logging
- [ ] Create privacy policy & terms of service
- [ ] Set up error tracking
- [ ] Test with real users (beta)
- [ ] Prepare customer support workflow
