#!/usr/bin/env python3
"""
Supabase Schema Verification Script
Compares actual database schema with SQLAlchemy models
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def verify_schema():
    """Verify Supabase database schema."""

    # Connect to Supabase
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    print("=" * 80)
    print("SUPABASE SCHEMA VERIFICATION")
    print("=" * 80)

    # 1. Check tables exist
    print("\n1. CHECKING TABLES...")
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [row[0] for row in cursor.fetchall()]

    expected_tables = ['users', 'notebooks', 'drawings', 'api_usage', 'billing']
    for table in expected_tables:
        status = "✅" if table in tables else "❌"
        print(f"   {status} {table}")

    # 2. Check unique constraints
    print("\n2. CHECKING UNIQUE CONSTRAINTS...")
    cursor.execute("""
        SELECT
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
    """)

    unique_constraints = {}
    for row in cursor.fetchall():
        table_name, column_name = row
        if table_name not in unique_constraints:
            unique_constraints[table_name] = []
        unique_constraints[table_name].append(column_name)

    expected_unique = {
        'users': ['email'],
        'notebooks': ['share_id'],
        'billing': ['user_id', 'stripe_customer_id', 'stripe_subscription_id']
    }

    for table, columns in expected_unique.items():
        for column in columns:
            has_constraint = table in unique_constraints and column in unique_constraints[table]
            status = "✅" if has_constraint else "❌"
            print(f"   {status} {table}.{column}")

    # 3. Check indexes
    print("\n3. CHECKING INDEXES...")
    cursor.execute("""
        SELECT
            t.relname AS table_name,
            i.relname AS index_name,
            a.attname AS column_name
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND t.relname IN ('users', 'notebooks', 'drawings', 'api_usage', 'billing')
        ORDER BY t.relname, i.relname;
    """)

    indexes = {}
    for row in cursor.fetchall():
        table_name, index_name, column_name = row
        if table_name not in indexes:
            indexes[table_name] = {}
        if index_name not in indexes[table_name]:
            indexes[table_name][index_name] = []
        indexes[table_name][index_name].append(column_name)

    # Expected indexes from models.py
    expected_indexes = {
        'users': ['email', 'stripe_customer_id'],
        'notebooks': ['user_id', 'share_id', 'idx_user_updated'],  # idx_user_updated is composite
        'drawings': ['notebook_id', 'created_at'],
        'api_usage': ['user_id', 'created_at', 'idx_user_created'],  # idx_user_created is composite
        'billing': ['user_id']
    }

    print("\n   Existing indexes by table:")
    for table, table_indexes in indexes.items():
        print(f"\n   {table}:")
        for index_name, columns in table_indexes.items():
            print(f"      - {index_name}: {', '.join(columns)}")

    # 4. Check foreign keys
    print("\n4. CHECKING FOREIGN KEYS...")
    cursor.execute("""
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
    """)

    expected_fks = {
        'notebooks': [('user_id', 'users', 'id')],
        'drawings': [('notebook_id', 'notebooks', 'id')],
        'api_usage': [('user_id', 'users', 'id')],
        'billing': [('user_id', 'users', 'id')]
    }

    fks = []
    for row in cursor.fetchall():
        fks.append(row)
        table, col, ref_table, ref_col = row
        print(f"   ✅ {table}.{col} → {ref_table}.{ref_col}")

    # 5. Check sequences
    print("\n5. CHECKING SEQUENCES...")
    cursor.execute("""
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        ORDER BY sequence_name;
    """)

    sequences = [row[0] for row in cursor.fetchall()]
    expected_sequences = [
        'users_id_seq',
        'notebooks_id_seq',
        'drawings_id_seq',
        'api_usage_id_seq',
        'billing_id_seq'
    ]

    for seq in expected_sequences:
        status = "✅" if seq in sequences else "❌"
        print(f"   {status} {seq}")

    # 6. Check data types
    print("\n6. CHECKING CRITICAL COLUMN TYPES...")
    cursor.execute("""
        SELECT
            table_name,
            column_name,
            data_type,
            character_maximum_length,
            is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'notebooks', 'drawings', 'api_usage', 'billing')
        ORDER BY table_name, ordinal_position;
    """)

    critical_columns = {
        ('users', 'email'): ('character varying', False),
        ('users', 'encrypted_api_key'): ('text', True),
        ('users', 'subscription_tier'): ('character varying', False),
        ('notebooks', 'share_id'): ('character varying', True),
        ('drawings', 'stroke_data'): ('json', True),
        ('api_usage', 'cost'): ('numeric', False),
        ('billing', 'stripe_customer_id'): ('character varying', True),
    }

    columns = {}
    for row in cursor.fetchall():
        table, col, dtype, max_len, nullable = row
        columns[(table, col)] = (dtype, nullable == 'YES')

    for (table, col), (expected_type, expected_nullable) in critical_columns.items():
        if (table, col) in columns:
            actual_type, actual_nullable = columns[(table, col)]
            type_match = expected_type in actual_type or actual_type in expected_type
            nullable_match = expected_nullable == actual_nullable

            if type_match and nullable_match:
                print(f"   ✅ {table}.{col}: {actual_type} (nullable={actual_nullable})")
            else:
                print(f"   ❌ {table}.{col}: Expected {expected_type} (nullable={expected_nullable}), Got {actual_type} (nullable={actual_nullable})")
        else:
            print(f"   ❌ {table}.{col}: Column not found!")

    cursor.close()
    conn.close()

    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    verify_schema()
