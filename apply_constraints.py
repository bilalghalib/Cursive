#!/usr/bin/env python3
"""
Apply missing UNIQUE constraints to Supabase database
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def apply_constraints():
    """Apply missing UNIQUE constraints."""

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    print("=" * 80)
    print("APPLYING MISSING UNIQUE CONSTRAINTS")
    print("=" * 80)

    constraints = [
        ("users", "email", "users_email_key"),
        ("notebooks", "share_id", "notebooks_share_id_key"),
        ("billing", "user_id", "billing_user_id_key"),
    ]

    for table, column, constraint_name in constraints:
        try:
            # Check if constraint already exists
            cursor.execute("""
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_schema = 'public'
                AND table_name = %s
                AND constraint_type = 'UNIQUE'
                AND constraint_name = %s;
            """, (table, constraint_name))

            if cursor.fetchone():
                print(f"   ✅ {table}.{column} - already has UNIQUE constraint")
                continue

            # Add constraint
            sql = f"ALTER TABLE public.{table} ADD CONSTRAINT {constraint_name} UNIQUE ({column});"
            cursor.execute(sql)
            conn.commit()
            print(f"   ✅ {table}.{column} - UNIQUE constraint added successfully")

        except psycopg2.errors.UniqueViolation as e:
            conn.rollback()
            print(f"   ❌ {table}.{column} - FAILED: Duplicate values exist!")
            print(f"      Error: {e}")
            print(f"      Fix: Remove duplicate {column} values before adding constraint")

        except Exception as e:
            conn.rollback()
            print(f"   ❌ {table}.{column} - FAILED: {e}")

    # Verify all constraints
    print("\n" + "=" * 80)
    print("VERIFICATION - Current UNIQUE Constraints:")
    print("=" * 80)

    cursor.execute("""
        SELECT
            tc.table_name,
            kcu.column_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
    """)

    for row in cursor.fetchall():
        table, column, constraint = row
        print(f"   ✅ {table}.{column} ({constraint})")

    cursor.close()
    conn.close()

    print("\n" + "=" * 80)
    print("DONE")
    print("=" * 80)

if __name__ == '__main__':
    apply_constraints()
