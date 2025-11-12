# 🚀 Cursive Setup Guide

Complete setup instructions for deploying Cursive with Phase 1 & 2 features (Authentication, Database, Billing, Rate Limiting).

---

## 📋 Prerequisites

Before setting up Cursive, ensure you have:

### Required
- **Python 3.8+** installed
- **PostgreSQL 12+** installed and running
- **Anthropic API Key** from [console.anthropic.com](https://console.anthropic.com)

### Optional (Recommended for Production)
- **Redis 6+** for session storage and rate limiting
- **Stripe Account** for billing (if monetizing)
- **Domain name** for production deployment

---

## 🛠️ Quick Start (Development)

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <your-repo-url>
cd Cursive

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Run Setup Wizard

```bash
# This will create .env file with generated keys
python setup.py
```

### 3. Configure Environment

Edit the generated `.env` file and add your credentials:

```bash
# Required: Add your Anthropic API key
CLAUDE_API_KEY=sk-ant-your-key-here

# Required: Configure PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/cursive_db

# Optional: Add Redis (recommended)
REDIS_URL=redis://localhost:6379/0

# Optional: Add Stripe keys (for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Initialize Database

```bash
# Create database tables and admin user
python setup.py --init-db
```

### 5. Run Development Server

```bash
# Start Flask development server
python proxy.py
```

Visit [http://localhost:5022](http://localhost:5022) to access Cursive!

---

## 🗄️ Database Setup

### PostgreSQL Installation

#### macOS (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb cursive_db
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb cursive_db
```

#### Windows
Download PostgreSQL installer from [postgresql.org](https://www.postgresql.org/download/windows/)

### Create Database User

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create user
CREATE USER cursive_user WITH PASSWORD 'secure_password_here';

-- Create database
CREATE DATABASE cursive_db OWNER cursive_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cursive_db TO cursive_user;
```

### Connection String Format

```
postgresql://username:password@host:port/database_name

# Local example:
DATABASE_URL=postgresql://cursive_user:secure_password@localhost:5432/cursive_db

# Remote example:
DATABASE_URL=postgresql://user:pass@db.example.com:5432/cursive_prod
```

---

## 🔴 Redis Setup (Optional but Recommended)

Redis is used for:
- Session storage (faster than filesystem)
- Rate limiting (distributed across multiple servers)

### Installation

#### macOS
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### Docker
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Configuration

```bash
# In .env file:
REDIS_URL=redis://localhost:6379/0

# For Redis with password:
REDIS_URL=redis://:password@localhost:6379/0
```

---

## 💳 Stripe Setup (For Billing)

### 1. Create Stripe Account

Go to [stripe.com](https://stripe.com) and create an account.

### 2. Get API Keys

From the Stripe Dashboard:
1. Click **Developers** → **API keys**
2. Copy your **Secret key** and **Publishable key**

### 3. Create Products and Prices

#### Pro Tier ($9/month)
1. Go to **Products** → **Add product**
2. Name: "Cursive Pro"
3. Pricing model: Recurring
4. Price: $9.00 USD per month
5. Copy the **Price ID** (starts with `price_...`)

#### Enterprise Tier (Custom)
Same steps as above, or use custom pricing.

### 4. Configure Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/billing/webhook`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy **Signing secret** (starts with `whsec_...`)

### 5. Add to .env

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Add price IDs
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

---

## 🔐 Security Configuration

### Generate Encryption Key

The encryption key is used to securely store user API keys (BYOK feature).

```bash
# Generate key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Add to .env
ENCRYPTION_KEY=generated_key_here
```

### Configure CORS

```bash
# In .env file, set allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5022,https://yourdomain.com,https://app.yourdomain.com
```

### Production Security Checklist

- [ ] Use HTTPS (not HTTP)
- [ ] Set strong `FLASK_SECRET_KEY`
- [ ] Restrict `ALLOWED_ORIGINS` to your domains only
- [ ] Use strong database passwords
- [ ] Enable Redis password authentication
- [ ] Keep API keys in `.env` (never commit to Git)
- [ ] Set `FLASK_ENV=production`

---

## 🌐 Production Deployment

### Using Gunicorn (Recommended)

```bash
# Install Gunicorn
pip install gunicorn

# Run with 4 worker processes
gunicorn wsgi:app --bind 0.0.0.0:5022 --workers 4
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 5022

# Run with Gunicorn
CMD ["gunicorn", "wsgi:app", "--bind", "0.0.0.0:5022", "--workers", "4"]
```

Build and run:

```bash
docker build -t cursive .
docker run -p 5022:5022 --env-file .env cursive
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5022:5022"
    environment:
      - DATABASE_URL=postgresql://cursive:password@db:5432/cursive_db
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cursive_db
      POSTGRES_USER: cursive
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Run:

```bash
docker-compose up -d
```

### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/cursive`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5022;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for streaming
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/cursive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🧪 Testing the Setup

### Health Check

```bash
curl http://localhost:5022/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Create Test User

```bash
curl -X POST http://localhost:5022/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:5022/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 📊 Monitoring

### Database Queries

```sql
-- Check users
SELECT id, email, subscription_tier, created_at FROM users;

-- Check API usage
SELECT user_id, SUM(tokens_used) as total_tokens, SUM(cost) as total_cost
FROM api_usage
GROUP BY user_id;

-- Check active subscriptions
SELECT u.email, b.subscription_status, b.tokens_used_this_period
FROM users u
JOIN billing b ON u.id = b.user_id
WHERE b.subscription_status = 'active';
```

### Logs

```bash
# Development
tail -f logs/cursive.log

# Production (Gunicorn)
tail -f /var/log/cursive/access.log
tail -f /var/log/cursive/error.log
```

---

## 🐛 Troubleshooting

### Database Connection Failed

**Problem:** `psycopg2.OperationalError: could not connect to server`

**Solutions:**
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify DATABASE_URL format in `.env`
3. Test connection: `psql -U cursive_user -d cursive_db`
4. Check PostgreSQL logs: `/var/log/postgresql/`

### Redis Connection Failed

**Problem:** `redis.exceptions.ConnectionError: Error connecting to Redis`

**Solutions:**
1. Check Redis is running: `redis-cli ping` (should return `PONG`)
2. Verify REDIS_URL in `.env`
3. Disable Redis in .env for development (will use filesystem sessions)

### Import Errors

**Problem:** `ModuleNotFoundError: No module named 'flask_sqlalchemy'`

**Solutions:**
```bash
pip install -r requirements.txt
```

### Port Already in Use

**Problem:** `OSError: [Errno 48] Address already in use`

**Solutions:**
```bash
# Find process using port 5022
lsof -i :5022

# Kill process
kill -9 <PID>

# Or use different port in proxy.py
```

### Rate Limit Errors in Development

**Problem:** Getting 429 errors while testing

**Solutions:**
```bash
# In .env, disable rate limiting temporarily
RATE_LIMIT_ENABLED=false
```

---

## 🔄 Database Migrations

If you modify database models, create migrations:

```bash
# Initialize Alembic (first time only)
flask db init

# Create migration
flask db migrate -m "Description of changes"

# Apply migration
flask db upgrade

# Rollback if needed
flask db downgrade
```

---

## 📚 Additional Resources

- **Anthropic API Docs:** [docs.anthropic.com](https://docs.anthropic.com)
- **Stripe Docs:** [stripe.com/docs](https://stripe.com/docs)
- **Flask Docs:** [flask.palletsprojects.com](https://flask.palletsprojects.com)
- **PostgreSQL Docs:** [postgresql.org/docs](https://www.postgresql.org/docs)

---

## 💬 Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/yourusername/Cursive/issues)
2. Review CLAUDE.md for architecture details
3. Review README.md for feature documentation

---

## ✅ Post-Setup Checklist

After completing setup, verify:

- [ ] Can access http://localhost:5022
- [ ] Health endpoint returns "ok"
- [ ] Can register a new user
- [ ] Can log in
- [ ] Can draw on canvas
- [ ] Can transcribe handwriting
- [ ] AI responds to queries
- [ ] Rate limiting works (make 50+ requests)
- [ ] Usage tracking appears in database
- [ ] (Optional) Stripe checkout works

**Congratulations! Cursive is ready to use! 🎉**
