#!/bin/bash

# Cursive - Supabase Deployment Script
# This script helps you deploy your Cursive backend to Supabase

set -e  # Exit on error

echo "🚀 Cursive Supabase Deployment Script"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo "📦 Install it with:"
    echo "   brew install supabase/tap/supabase"
    echo "   or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Not logged in to Supabase"
    echo "📝 Logging in now..."
    supabase login
fi

echo "✅ Logged in to Supabase"
echo ""

# Check if project is linked
if [ ! -f .supabase/config.toml ]; then
    echo "🔗 Project not linked to Supabase"
    echo ""
    read -p "Enter your Supabase project ref (from dashboard): " PROJECT_REF

    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project ref cannot be empty"
        exit 1
    fi

    echo "🔗 Linking project..."
    supabase link --project-ref "$PROJECT_REF"
fi

echo "✅ Project linked"
echo ""

# Set secrets
echo "🔐 Setting up secrets..."
echo ""

read -p "Enter your Anthropic API key (sk-ant-...): " CLAUDE_API_KEY
if [ -z "$CLAUDE_API_KEY" ]; then
    echo "❌ Anthropic API key is required"
    exit 1
fi

read -p "Enter your Stripe secret key (sk_...): " STRIPE_SECRET_KEY
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ Stripe secret key is required"
    exit 1
fi

read -p "Enter your Stripe webhook secret (whsec_...): " STRIPE_WEBHOOK_SECRET
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "❌ Stripe webhook secret is required"
    exit 1
fi

echo ""
echo "📤 Setting secrets in Supabase..."

supabase secrets set CLAUDE_API_KEY="$CLAUDE_API_KEY"
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"

echo "✅ Secrets set"
echo ""

# Deploy Edge Functions
echo "📦 Deploying Edge Functions..."
echo ""

echo "🚀 Deploying claude-proxy..."
supabase functions deploy claude-proxy --no-verify-jwt

echo "✅ claude-proxy deployed"
echo ""

echo "🚀 Deploying stripe-webhook..."
supabase functions deploy stripe-webhook --no-verify-jwt

echo "✅ stripe-webhook deployed"
echo ""

# Run database migration
echo "🗄️  Running database migration..."
echo ""

read -p "Do you want to run the database migration? (y/n): " RUN_MIGRATION

if [ "$RUN_MIGRATION" = "y" ] || [ "$RUN_MIGRATION" = "Y" ]; then
    echo "📤 Applying migration..."
    supabase db push
    echo "✅ Migration applied"
else
    echo "⏭️  Skipping migration (run manually via Supabase Dashboard > SQL Editor)"
fi

echo ""
echo "=================================="
echo "🎉 Deployment Complete!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update your frontend with Supabase credentials:"
echo "   - Edit static/js/supabaseClient.js"
echo "   - Update SUPABASE_URL and SUPABASE_ANON_KEY"
echo ""
echo "2. Update API endpoints in frontend:"
echo "   - Edit static/js/aiService.js"
echo "   - Change fetch URLs to point to Supabase functions"
echo ""
echo "3. Set up Stripe webhook:"
echo "   - Go to Stripe Dashboard > Webhooks"
echo "   - Add endpoint: https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook"
echo "   - Select events: checkout.session.completed, customer.subscription.updated, etc."
echo ""
echo "4. Test everything:"
echo "   - Sign up a new user"
echo "   - Make a Claude API call"
echo "   - Test Stripe checkout"
echo ""
echo "📚 Full guide: See SUPABASE_MIGRATION.md"
echo ""
echo "✅ You're all set! Happy coding! 🚀"
