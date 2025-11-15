#!/bin/bash

# Cursive Refactor Cleanup Script
# This script safely removes old Flask/vanilla JS files after migration to Next.js
# Run with: bash cleanup.sh [phase]
# Phases: phase1 (safe deletions), phase2 (after porting), all (everything)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if file/directory exists before deleting
safe_delete() {
    local path=$1
    if [ -e "$path" ]; then
        rm -rf "$path"
        print_success "Deleted: $path"
        return 0
    else
        print_warning "Not found (skipping): $path"
        return 1
    fi
}

# Phase 1: Safe Deletions (no dependencies)
phase1_cleanup() {
    print_info "Starting Phase 1: Safe Deletions"
    echo ""

    print_info "Deleting old Flask templates..."
    safe_delete "templates/"

    print_info "Deleting old shareable pages directory..."
    safe_delete "pages/"

    print_info "Deleting old documentation files..."
    safe_delete "BUG_REPORT.md"
    safe_delete "CLAUDE_4.5_UPGRADE.md"
    safe_delete "DEV_SETUP.md"
    safe_delete "EXECUTIVE_SUMMARY.md"
    safe_delete "FIXES_APPLIED.md"
    safe_delete "FLASK_TO_SUPABASE_MIGRATION.md"
    safe_delete "HANDWRITING_SETUP.md"
    safe_delete "HANDWRITING_WRITEBACK.md"
    safe_delete "IMPLEMENTATION_PLAN.md"
    safe_delete "MIGRATION_SUMMARY.md"
    safe_delete "NEXT_STEPS.md"
    safe_delete "QUICK_START.md"
    safe_delete "REACT_MIGRATION_ANALYSIS.md"
    safe_delete "SESSION_SUMMARY.md"
    safe_delete "SETUP.md"
    safe_delete "SETUP_SIMPLE.md"
    safe_delete "SUPABASE_DEPLOYMENT.md"
    safe_delete "SUPABASE_MIGRATION.md"
    safe_delete "SUPABASE_SETUP.md"
    safe_delete "SUPABASE_SUMMARY.md"
    safe_delete "TS_MIGRATION.md"
    safe_delete "VALUES_ACTION_PLAN.md"
    safe_delete "VALUES_AUDIT.md"
    safe_delete "VALUES_EXPERIENCE.md"
    safe_delete "VERCEL_SUPABASE_REFACTOR.md"
    safe_delete "apply_supabase_migration.md"
    safe_delete "cursiveFromClaudeResearch.txt"
    safe_delete "deploy-to-supabase.sh"

    print_info "Deleting parts of static/ that are fully replaced..."
    safe_delete "static/config/"
    safe_delete "static/css/"
    safe_delete "static/types/"

    print_info "Deleting vanilla JS files that are fully replaced..."
    safe_delete "static/js/aiCanvasIntegration.js"
    safe_delete "static/js/aiService.supabase.js.disabled"
    safe_delete "static/js/aiService.ts"
    safe_delete "static/js/app.js"
    safe_delete "static/js/authService.js"
    safe_delete "static/js/authService.js.disabled"
    safe_delete "static/js/canvasManager.js"
    safe_delete "static/js/canvasWriteback.js"
    safe_delete "static/js/collaborationService.js"
    safe_delete "static/js/config.js"
    safe_delete "static/js/config.ts"
    safe_delete "static/js/dataManager.supabase.js.disabled"
    safe_delete "static/js/env.example.js"
    safe_delete "static/js/env.js"
    safe_delete "static/js/handwritingStorage.js"
    safe_delete "static/js/handwritingSynthesis.js"
    safe_delete "static/js/handwritingTrainer.js"
    safe_delete "static/js/initialDrawing.json"
    safe_delete "static/js/llmStyleGuide.js"
    safe_delete "static/js/promptManager.js"
    safe_delete "static/js/sharingService.js"
    safe_delete "static/js/supabaseClient.js"
    safe_delete "static/js/supabaseClient.js.disabled"
    safe_delete "static/js/version.js"
    safe_delete "static/js/version.ts"

    echo ""
    print_success "Phase 1 cleanup complete!"
    print_warning "Remaining files in static/js/ need porting before deletion:"
    print_warning "  - static/js/handwritingSimulation.js (port to React)"
    print_warning "  - static/js/pluginManager.js (port to React)"
    print_warning "  - static/js/plugins/*.js (port to React)"
    print_warning "  - static/js/aiService.js (port to TypeScript)"
    print_warning "  - static/js/dataManager.js (port to TypeScript)"
}

# Phase 2: Delete after porting
phase2_cleanup() {
    print_info "Starting Phase 2: Delete files after porting"
    echo ""

    print_warning "⚠️  WARNING: This will delete files that may not have been ported yet!"
    print_warning "Make sure you have ported the following before proceeding:"
    print_warning "  - Handwriting simulation (static/js/handwritingSimulation.js)"
    print_warning "  - Plugin system (static/js/pluginManager.js + plugins/*.js)"
    print_warning "  - AI service (static/js/aiService.js)"
    print_warning "  - Data management (static/js/dataManager.js)"
    echo ""

    read -p "Have you ported all these features? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_error "Aborted. Please port features first."
        exit 1
    fi

    print_info "Deleting remaining static/ files..."
    safe_delete "static/js/handwritingSimulation.js"
    safe_delete "static/js/pluginManager.js"
    safe_delete "static/js/plugins/"
    safe_delete "static/js/aiService.js"
    safe_delete "static/js/dataManager.js"

    print_info "Deleting entire static/ directory..."
    safe_delete "static/"

    echo ""
    print_success "Phase 2 cleanup complete!"
}

# Update .gitignore
update_gitignore() {
    print_info "Updating .gitignore..."

    if [ -f ".gitignore" ]; then
        # Create backup
        cp .gitignore .gitignore.backup
        print_success "Created backup: .gitignore.backup"

        # Remove old Flask/Python entries
        sed -i '/static\/js\/\.DS_Store/d' .gitignore
        sed -i '/static\/\.DS_Store/d' .gitignore
        sed -i '/static\/js\/env\.js/d' .gitignore
        sed -i '/# Flask/,+2d' .gitignore
        sed -i '/# Python/,+4d' .gitignore
        sed -i '/# Auto-generated files/,+1d' .gitignore

        print_success ".gitignore updated (backup saved)"
    else
        print_warning ".gitignore not found"
    fi
}

# Show usage
usage() {
    echo "Cursive Refactor Cleanup Script"
    echo ""
    echo "Usage: bash cleanup.sh [phase]"
    echo ""
    echo "Phases:"
    echo "  phase1       - Safe deletions (no dependencies)"
    echo "  phase2       - Delete after porting (requires confirmation)"
    echo "  all          - Run both phases (requires confirmation)"
    echo "  gitignore    - Update .gitignore only"
    echo ""
    echo "Examples:"
    echo "  bash cleanup.sh phase1     # Run Phase 1 only"
    echo "  bash cleanup.sh all        # Run all phases"
}

# Main script
main() {
    local phase=${1:-help}

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          Cursive Refactor Cleanup Script                      ║"
    echo "║          Flask/Vanilla JS → Next.js/React Migration           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    case "$phase" in
        phase1)
            phase1_cleanup
            ;;
        phase2)
            phase2_cleanup
            ;;
        all)
            phase1_cleanup
            echo ""
            echo "───────────────────────────────────────────────────────────────"
            echo ""
            phase2_cleanup
            ;;
        gitignore)
            update_gitignore
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Unknown phase: $phase"
            echo ""
            usage
            exit 1
            ;;
    esac

    echo ""
    print_info "Cleanup complete! Next steps:"
    echo "  1. Review changes with: git status"
    echo "  2. Test the app with: npm run dev"
    echo "  3. Build for production: npm run build"
    echo "  4. Commit changes: git add -A && git commit -m 'chore: Clean up old Flask files'"
    echo ""
}

# Run main function
main "$@"
