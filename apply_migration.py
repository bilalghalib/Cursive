#!/usr/bin/env python3
"""
Apply Supabase Migration Script

This script applies the initial schema migration to your Supabase database.
It requires the Supabase database connection string.
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv('.env.supabase', override=True)
load_dotenv('.env', override=True)

def get_database_url():
    """Get the database URL from environment or construct from Supabase credentials."""

    # Try direct DATABASE_URL first
    if os.getenv('DATABASE_URL'):
        return os.getenv('DATABASE_URL')

    # Try to construct from Supabase URL
    supabase_url = os.getenv('SUPABASE_URL')
    if supabase_url:
        # Extract project ref from URL
        # Format: https://kfgmeonhhmchoyoklswm.supabase.co
        project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '')

        # Supabase PostgreSQL connection string format
        # You'll need to get the actual password from Supabase dashboard
        print(f"\n⚠️  DATABASE_URL not found in environment.")
        print(f"\nTo get your Supabase database connection string:")
        print(f"1. Go to https://supabase.com/dashboard/project/{project_ref}/settings/database")
        print(f"2. Look for 'Connection string' under 'Connection info'")
        print(f"3. Copy the 'URI' connection string")
        print(f"4. Add it to your .env file as DATABASE_URL=...")
        print(f"\nIt should look like:")
        print(f"postgresql://postgres:[YOUR-PASSWORD]@db.{project_ref}.supabase.co:5432/postgres")
        return None

    print("❌ Neither DATABASE_URL nor SUPABASE_URL found in environment!")
    return None

def apply_migration(migration_file, db_url):
    """Apply a migration SQL file to the database."""

    print(f"\n{'='*80}")
    print(f"APPLYING SUPABASE MIGRATION")
    print(f"{'='*80}\n")

    # Read migration file
    print(f"📄 Reading migration file: {migration_file}")
    try:
        with open(migration_file, 'r') as f:
            sql = f.read()
    except FileNotFoundError:
        print(f"❌ Migration file not found: {migration_file}")
        return False

    print(f"✅ Migration file loaded ({len(sql)} characters)\n")

    # Connect to database
    print(f"🔌 Connecting to Supabase database...")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor()
        print(f"✅ Connected successfully\n")
    except Exception as e:
        print(f"❌ Failed to connect to database:")
        print(f"   {str(e)}")
        return False

    # Execute migration
    print(f"🚀 Applying migration...")
    try:
        cursor.execute(sql)
        conn.commit()
        print(f"✅ Migration applied successfully!\n")

        # Verify tables were created
        print(f"🔍 Verifying tables...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)

        tables = [row[0] for row in cursor.fetchall()]
        expected_tables = ['notebooks', 'drawings', 'user_settings', 'api_usage', 'billing']

        print(f"\nCreated tables:")
        for table in expected_tables:
            if table in tables:
                print(f"  ✅ {table}")
            else:
                print(f"  ⚠️  {table} (not found - might already exist or creation failed)")

        cursor.close()
        conn.close()

        print(f"\n{'='*80}")
        print(f"MIGRATION COMPLETE!")
        print(f"{'='*80}\n")
        print(f"You can now use the 'save to web' feature in Cursive.\n")

        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Failed to apply migration:")
        print(f"   {str(e)}\n")

        # Check if it's because tables already exist
        if "already exists" in str(e):
            print(f"💡 Tip: Some tables might already exist.")
            print(f"   If you want to recreate them, you'll need to drop them first.")
            print(f"   ⚠️  WARNING: This will delete all data in those tables!")

        cursor.close()
        conn.close()
        return False

def main():
    """Main entry point."""

    print("\n🎨 Cursive - Supabase Migration Tool\n")

    # Get migration file path
    migration_file = 'supabase/migrations/20251113000000_initial_schema.sql'

    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        print(f"   Make sure you're running this from the Cursive root directory.")
        sys.exit(1)

    # Get database URL
    db_url = get_database_url()

    if not db_url:
        print("\n❌ Cannot proceed without database connection string.")
        print("   Please set DATABASE_URL in your .env or .env.supabase file.\n")
        sys.exit(1)

    # Confirm before proceeding
    print(f"\n⚠️  This will create the following tables in your Supabase database:")
    print(f"   - user_settings")
    print(f"   - notebooks")
    print(f"   - drawings")
    print(f"   - api_usage")
    print(f"   - billing")
    print(f"\nAlong with indexes, triggers, and RLS policies.")

    response = input("\nContinue? (yes/no): ")

    if response.lower() not in ['yes', 'y']:
        print("\n❌ Migration cancelled.\n")
        sys.exit(0)

    # Apply migration
    success = apply_migration(migration_file, db_url)

    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
