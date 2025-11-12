# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Project Overview

**Cursive** is an AI-powered digital notebook that combines handwriting input with Claude AI conversation. Users draw on an infinite canvas, select handwritten text for transcription via Claude's vision API, and receive responses in simulated handwriting fonts.

**Target Users:** Tablet users with stylus (iPad, Surface, etc.)
**Current Status:** Functional beta prototype, needs modernization for public launch

---

## 🚀 Build Commands

### Development
```bash
python proxy.py              # Run Flask dev server on port 5022
```

### Production
```bash
gunicorn wsgi:app --bind 0.0.0.0:5022 --workers 4
```

### Environment Setup
```bash
# Create .env file with:
CLAUDE_API_KEY=your_anthropic_api_key_here
```

---

## 🏗️ Development Environment

### Backend
- **Framework:** Flask (Python)
- **Production Server:** Gunicorn (WSGI)
- **AI SDK:** Anthropic Python SDK
- **Environment:** python-dotenv for config

### Frontend
- **Architecture:** Vanilla JavaScript ES6 modules (no build step)
- **Canvas:** HTML5 Canvas API with pointer events
- **Storage:** LocalStorage for persistence
- **Exports:** jsPDF, FileSaver.js

### Configuration
- API key: `.env` file (CLAUDE_API_KEY)
- App config: `static/config/config.yaml`
- Version management: `static/js/version.js`

---

## 📊 Code Review Summary

### ✅ STRENGTHS (5 Pros)

1. **Unique UX** - Handwriting-to-AI pipeline is innovative and well-executed
2. **Solid Architecture** - Clean module separation, streaming API, good state management
3. **Thoughtful Details** - Palm rejection, pressure sensitivity, visual feedback animations
4. **Extensible** - Plugin system is well-designed
5. **Production-Ready Deploy** - WSGI, CORS, version management in place

### ⚠️ WEAKNESSES (5 Cons)

1. **Security Vulnerabilities**
   - No authentication/authorization
   - CORS wildcard (`*` in proxy.py:97, 121)
   - No input sanitization
   - Single API key for all users

2. **No User/Billing System**
   - Can't monetize (no way to charge users)
   - No usage tracking or limits
   - API costs uncontrolled

3. **Code Quality Issues**
   - Large monolithic files (app.js: 1825 lines, canvasManager.js: 1639 lines)
   - Magic numbers throughout
   - Dead code (aiService.js:158-165)
   - Inconsistent error handling

4. **Limited Scalability**
   - LocalStorage only (no database)
   - File system storage grows unbounded
   - No cleanup mechanisms
   - Synchronous save operations

5. **Missing Modern Practices**
   - No build system
   - No TypeScript
   - No automated tests
   - No CI/CD
   - No monitoring/observability

---

## 🎯 Current Status

### What Works ✅
- Drawing with pressure sensitivity
- Handwriting OCR via Claude Vision
- Conversational AI with streaming responses
- Export to PDF, JSON, shareable URLs
- Plugin system (5 built-in plugins)
- Dark/light theme switching

### Critical Blockers for Launch 🚨

**CANNOT launch publicly without:**

1. **User Authentication** - Anyone can use your API key right now
2. **Rate Limiting** - No protection against abuse or runaway costs
3. **Database** - LocalStorage doesn't work for multi-user
4. **Billing System** - Can't charge users or track usage
5. **Security Fixes** - CORS, input sanitization, session management

---

## 🛠️ Next Steps: Modernization Roadmap

### PHASE 1: Security & User Management (CRITICAL)
**Timeline:** 2-3 weeks | **Priority:** MUST DO BEFORE LAUNCH

#### Tasks:
- [ ] Implement authentication system
  - Use Auth0, Clerk, or NextAuth.js
  - Support email/password and OAuth (Google, GitHub)
  - Create user database schema

- [ ] Add API key management
  - BYOK option: Let users provide their own Anthropic key
  - Store encrypted keys per user (use cryptography library)
  - Add settings UI for key management

- [ ] Create billing system
  - Integrate Stripe for payments
  - Track API usage per user (store in database)
  - Implement usage quotas and metering
  - Calculate costs: `(Anthropic_cost × 1.15) + base_subscription`

- [ ] Add rate limiting
  - Use Redis for distributed rate limiting
  - Set limits: 50 requests/minute per user, 500/day
  - Add graceful degradation with clear error messages

- [ ] Fix security issues
  - Remove CORS wildcard, use specific allowed origins
  - Add input validation (max length, character allowlist)
  - Implement CSRF protection
  - Add secure session management (httpOnly cookies)
  - Sanitize all user inputs before storage

**Files to modify:**
- `proxy.py` - Add auth middleware, rate limiting, input validation
- Create new: `auth.py`, `billing.py`, `rate_limiter.py`
- Frontend: Add login/signup pages, settings page

---

### PHASE 2: Database & Scalability (HIGH PRIORITY)
**Timeline:** 2 weeks | **Priority:** Required for multi-user

#### Tasks:
- [ ] Set up PostgreSQL database
  ```sql
  Tables needed:
  - users (id, email, encrypted_api_key, subscription_tier, created_at)
  - notebooks (id, user_id, title, created_at, updated_at)
  - drawings (id, notebook_id, stroke_data, timestamp)
  - api_usage (id, user_id, tokens_used, cost, timestamp)
  - billing (id, user_id, stripe_customer_id, subscription_status)
  ```

- [ ] Set up Redis
  - Session storage
  - Rate limiting counters
  - Cache frequently accessed data

- [ ] Migrate localStorage to backend storage
  - Create REST API for drawings CRUD
  - Update dataManager.js to use API instead of localStorage
  - Add pagination for large notebooks

- [ ] Implement cleanup mechanisms
  - Scheduled job to archive old pages
  - S3/CloudFlare R2 for drawing storage (Canvas images)
  - Compression for stroke data

**Files to modify:**
- Create new: `database.py`, `models.py`, `api_routes.py`
- `dataManager.js` - Replace localStorage with fetch() API calls
- `proxy.py` - Add database connection, ORM (SQLAlchemy)

---

### PHASE 3: Code Quality (MEDIUM PRIORITY)
**Timeline:** 1-2 weeks | **Priority:** Improves maintainability

#### Tasks:
- [ ] Break down monolithic files
  ```javascript
  app.js (1825 lines) → split into:
    - app.js (init, event handlers)
    - chatHandler.js (chat logic)
    - exportHandler.js (PDF, JSON exports)
    - modalManager.js (modal interactions)
    - themeManager.js (dark/light theme)

  canvasManager.js (1639 lines) → split into:
    - canvasManager.js (init, core rendering)
    - drawingManager.js (stroke handling)
    - selectionManager.js (selection logic)
    - zoomPanManager.js (viewport controls)
    - touchHandler.js (touch/stylus events)
  ```

- [ ] Add TypeScript
  - Install TypeScript, set up tsconfig.json
  - Gradually migrate modules starting with utils
  - Define interfaces for Stroke, NotebookItem, Drawing, etc.

- [ ] Set up build system
  - Use Vite (fast, modern, great DX)
  - Configure for production builds with minification
  - Set up environment-based config (dev/staging/prod)

- [ ] Add testing
  - Unit tests: Vitest for JS/TS modules
  - Integration tests: Playwright for E2E flows
  - Target 70%+ coverage on critical paths

- [ ] Improve error handling
  - Create centralized error handler
  - Replace alerts with toast notifications
  - Log errors to backend for monitoring

**Files to create:**
- `package.json`, `tsconfig.json`, `vite.config.ts`
- `tests/` directory with unit and E2E tests

---

### PHASE 4: DevOps & Monitoring (MEDIUM PRIORITY)
**Timeline:** 1 week | **Priority:** Required for production

#### Tasks:
- [ ] Set up CI/CD
  - GitHub Actions for automated testing
  - Auto-deploy to staging on merge to `main`
  - Manual approval for production deploys

- [ ] Add monitoring
  - **Error tracking:** Sentry for frontend and backend errors
  - **Metrics:** Datadog or New Relic for performance monitoring
  - **Logs:** CloudWatch or ELK stack for log aggregation
  - **Uptime:** UptimeRobot or Pingdom

- [ ] Create staging environment
  - Separate database, API keys, domain
  - Use staging for QA before production

- [ ] Implement health checks
  ```python
  @app.route('/health')
  def health_check():
      return {'status': 'ok', 'database': check_db(), 'redis': check_redis()}
  ```

- [ ] Set up backups
  - Daily PostgreSQL backups to S3
  - Retention policy: 30 days
  - Test restore procedure monthly

**Files to create:**
- `.github/workflows/ci.yml`, `deploy.yml`
- `docker-compose.yml` for local multi-service setup
- `monitoring/` directory with alerting rules

---

## 💰 Monetization Strategy

Based on your requirements (BYOK or 15% fee), here's the recommended approach:

### Hybrid Model (Best of Both Worlds)

**Tier 1: Free (BYOK)**
- User provides own Anthropic API key
- No usage limits
- Basic features only
- No support

**Tier 2: Pro ($9/month)**
- We provide API access (no key needed)
- 50,000 tokens included
- $0.02 per 1K tokens after (15% markup on Anthropic pricing)
- Priority support
- Advanced features (templates, collaboration, etc.)

**Tier 3: Enterprise (Custom pricing)**
- Dedicated support
- Custom integrations
- SLA guarantees
- Volume discounts

### Implementation Steps:

1. **Add Stripe integration**
   ```python
   # billing.py
   import stripe
   stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

   def create_subscription(user_id, price_id):
       # Create customer, attach payment method, subscribe

   def track_usage(user_id, tokens_used):
       # Increment usage counter for billing
   ```

2. **Track API usage**
   ```python
   # Middleware to count tokens
   @app.before_request
   def track_api_usage():
       if request.path.startswith('/api/claude'):
           # Log tokens used, calculate cost
           # Store in database for billing
   ```

3. **Add settings page**
   - Option to add own API key (BYOK)
   - View current usage and costs
   - Upgrade/downgrade subscription
   - Billing history

---

## 🎨 Code Style Guidelines

### Python
- **Style:** PEP 8
- **Indentation:** 4 spaces
- **Docstrings:** Google style
- **Type hints:** Use for all function signatures
- **Example:**
  ```python
  def create_user(email: str, password: str) -> User:
      """Create a new user account.

      Args:
          email: User's email address
          password: Plain text password (will be hashed)

      Returns:
          User object with generated ID

      Raises:
          ValueError: If email already exists
      """
      # Implementation
  ```

### JavaScript/TypeScript
- **Indentation:** 2 spaces
- **Naming:** camelCase for variables/functions
- **Constants:** UPPER_SNAKE_CASE
- **Example:**
  ```typescript
  async function sendToAI(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      return await response.json();
    } catch (error) {
      logError('AI request failed', error);
      throw error;
    }
  }
  ```

### Error Handling
- Always use try/catch for async operations
- Log errors to console AND backend
- Show user-friendly messages (not raw errors)
- Example:
  ```javascript
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Operation failed:', error);
    logToBackend('riskyOperation', error);
    showToast('Something went wrong. Please try again.');
  }
  ```

---

## 📁 Project Structure

```
Cursive/
├── proxy.py                    # Flask backend (main app)
├── wsgi.py                     # Production WSGI entry
├── requirements.txt            # Python dependencies
├── .env                        # API keys (gitignored)
├── auth.py                     # [TO ADD] Authentication logic
├── billing.py                  # [TO ADD] Stripe integration
├── database.py                 # [TO ADD] DB connection
├── models.py                   # [TO ADD] SQLAlchemy models
│
├── static/
│   ├── css/
│   │   └── styles.css          # Main stylesheet
│   ├── js/
│   │   ├── app.js              # Main app (1825 lines - NEEDS REFACTOR)
│   │   ├── canvasManager.js    # Canvas logic (1639 lines - NEEDS REFACTOR)
│   │   ├── aiService.js        # Claude API client
│   │   ├── dataManager.js      # Storage (localStorage → API)
│   │   ├── handwritingSimulation.js  # Font rendering
│   │   ├── pluginManager.js    # Plugin system
│   │   ├── promptManager.js    # Prompt handling
│   │   ├── config.js           # Config loader
│   │   ├── version.js          # Cache busting
│   │   └── plugins/
│   │       ├── index.js
│   │       ├── calculatorPlugin.js
│   │       ├── ocrPlugin.js
│   │       ├── shapeToolsPlugin.js
│   │       ├── colorPickerPlugin.js
│   │       └── templatesPlugin.js
│   └── config/
│       └── config.yaml         # App configuration
│
├── templates/
│   └── index.html              # Main page template
│
├── pages/                      # User-generated shareable pages
│   └── [uuid]/
│       └── data.json
│
└── [TO ADD]
    ├── tests/                  # Test suite
    ├── docker-compose.yml      # Local dev environment
    ├── .github/workflows/      # CI/CD pipelines
    └── monitoring/             # Alerting rules
```

---

## 🔑 Key Components

### Backend (proxy.py)
**Lines 1-241**
- Flask app setup with CORS
- `/api/claude` - Non-streaming AI requests
- `/api/claude/stream` - Streaming AI responses
- `/api/save-to-web` - Generate shareable page URLs
- `serve_page()` - Serve saved pages with data

**Security Issues (TO FIX):**
- Line 19: CORS allows single origin (good), but line 97/121 use wildcard (bad)
- Line 32-64: No authentication on /api/claude endpoint
- Line 128-140: Page IDs not sanitized before file system access

### Frontend Modules

**app.js** (1825 lines)
- Main application initialization
- Event handlers for toolbar buttons
- Chat handling (typed and handwritten)
- Modal management
- Export functionality (PDF, JSON, web)
- Plugin system initialization

**canvasManager.js** (1639 lines)
- Canvas initialization and resizing
- Drawing with pressure sensitivity
- Touch handling with palm rejection
- Selection rectangle with visual feedback
- Pan and zoom functionality
- Undo/redo stack management
- Text overlay rendering

**aiService.js** (166 lines)
- `sendImageToAI()` - OCR via Claude Vision
- `sendChatToAI()` - Chat with streaming support
- Response parsing

**dataManager.js**
- LocalStorage CRUD for notebooks
- Import/export JSON
- Drawing persistence
- Save to web (generate shareable URLs)

**handwritingSimulation.js**
- Simulated handwriting rendering
- Multiple font styles (cursive, neat, print, messy)
- Character-by-character variation

**pluginManager.js**
- Plugin registration and lifecycle
- Toolbar rendering
- Plugin state management

---

## 🐛 Known Issues

### Critical (Fix Before Launch)
1. **No authentication** - Anyone can use your API key (proxy.py:32)
2. **No rate limiting** - Vulnerable to abuse
3. **CORS wildcard** - Security risk (proxy.py:97, 121)
4. **No input validation** - Injection risks (proxy.py:38-45)

### High Priority
5. **Dead code** - aiService.js:158-165 (downloadImage function)
6. **Magic numbers** - 200ms, 300ms delays hardcoded everywhere
7. **Large files** - app.js (1825), canvasManager.js (1639) need splitting
8. **No error boundaries** - Errors crash entire app

### Medium Priority
9. **LocalStorage limits** - Will fail with large notebooks
10. **No cleanup** - pages/ folder grows indefinitely
11. **Synchronous saves** - Can block UI
12. **Inconsistent error handling** - Mix of alerts and console.error

---

## 🚨 Critical Security Issues (MUST FIX)

### 1. API Key Exposure
**File:** `proxy.py:24-30`
**Issue:** Single server-side key used for all users
**Impact:** You pay for everyone's API usage, no way to bill users
**Fix:**
```python
# Add per-user key storage
def get_api_key(user_id):
    user = db.session.query(User).get(user_id)
    if user.api_key:
        return decrypt(user.api_key)  # User's own key
    else:
        track_usage(user_id)  # Track for billing
        return os.getenv('CLAUDE_API_KEY')  # Your key with fee
```

### 2. No Rate Limiting
**File:** `proxy.py:32-64`
**Issue:** Unlimited API calls per user/IP
**Impact:** Abuse, runaway costs
**Fix:**
```python
from flask_limiter import Limiter
limiter = Limiter(app, key_func=get_remote_address)

@limiter.limit("50/minute")
@app.route('/api/claude', methods=['POST'])
def handle_claude_request():
    # ...
```

### 3. CORS Wildcard
**File:** `proxy.py:97, 121`
**Issue:** `Access-Control-Allow-Origin: *` allows any domain
**Impact:** CSRF attacks, data theft
**Fix:**
```python
ALLOWED_ORIGINS = ['https://yourdomain.com', 'https://app.yourdomain.com']

def build_actual_response(response, status=200):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers.add("Access-Control-Allow-Origin", origin)
    return response, status
```

### 4. No Input Validation
**File:** `proxy.py:38-45`
**Issue:** User data sent directly to API without validation
**Impact:** Injection attacks, DoS
**Fix:**
```python
from marshmallow import Schema, fields, ValidationError

class ClaudeRequestSchema(Schema):
    model = fields.Str(required=True, validate=lambda x: x in ALLOWED_MODELS)
    max_tokens = fields.Int(required=True, validate=lambda x: 1 <= x <= 4096)
    messages = fields.List(fields.Dict(), required=True, validate=lambda x: len(x) <= 100)

@app.route('/api/claude', methods=['POST'])
def handle_claude_request():
    try:
        data = ClaudeRequestSchema().load(request.get_json())
    except ValidationError as e:
        return jsonify({"error": "Invalid request", "details": e.messages}), 400
    # ...
```

### 5. Path Traversal Risk
**File:** `proxy.py:145-161`
**Issue:** User-provided page_id used in file path without sanitization
**Impact:** Directory traversal, file system access
**Fix:**
```python
import re

@app.route('/pages/<page_id>')
def serve_page(page_id=None):
    if page_id:
        # Sanitize: only allow alphanumeric and hyphens
        if not re.match(r'^[a-zA-Z0-9-]+$', page_id):
            return "Invalid page ID", 400

        page_path = os.path.join(base_dir, 'pages', page_id, 'data.json')
        # Ensure path is within pages directory
        if not os.path.abspath(page_path).startswith(os.path.join(base_dir, 'pages')):
            return "Invalid page ID", 400
        # ...
```

---

## 📝 Development Workflow

### Before Starting Work
1. Pull latest: `git pull origin main`
2. Create feature branch: `git checkout -b feature/your-feature`
3. Update dependencies: `pip install -r requirements.txt`

### During Development
- Run dev server: `python proxy.py`
- Check logs for errors
- Test in multiple browsers (Chrome, Safari, Firefox)
- Test on tablet if working on canvas/touch features

### Before Committing
- [ ] Code follows style guidelines
- [ ] No console.log() statements left in
- [ ] Error handling added for new code
- [ ] Comments added for complex logic
- [ ] Tested manually
- [ ] No breaking changes to existing features

### Commit Message Format
```
type(scope): brief description

Longer description if needed

- Bullet points for key changes
- Reference issues: Fixes #123
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

---

## 🧪 Testing Guidelines

### Manual Testing Checklist
- [ ] Drawing works with mouse and touch
- [ ] Selection → transcription → AI response flow
- [ ] Export to PDF includes all content
- [ ] Dark/light theme switches properly
- [ ] Plugin toolbar renders correctly
- [ ] Undo/redo works as expected
- [ ] Pan and zoom feel smooth
- [ ] Shareable URLs load correctly

### Automated Testing (TO ADD)
```javascript
// tests/canvas.test.ts
describe('Canvas Manager', () => {
  test('should initialize canvas with correct dimensions', () => {
    // ...
  });

  test('should handle touch events with palm rejection', () => {
    // ...
  });
});
```

---

## ⚠️ Pre-Launch Checklist

**DO NOT DEPLOY TO PRODUCTION UNTIL:**

- [ ] User authentication implemented
- [ ] Rate limiting added
- [ ] Database set up (PostgreSQL + Redis)
- [ ] Billing system integrated (Stripe)
- [ ] All security issues fixed
- [ ] CORS wildcard removed
- [ ] Input validation added
- [ ] Error tracking set up (Sentry)
- [ ] Monitoring configured (Datadog/New Relic)
- [ ] Backups automated
- [ ] Privacy policy and ToS written
- [ ] Beta testing completed with 10+ users
- [ ] Load testing completed
- [ ] Customer support process defined

---

**IMPORTANT:** This context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
