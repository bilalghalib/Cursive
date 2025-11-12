#!/usr/bin/env python
"""
Setup script for Cursive application.

This script helps initialize the database, generate encryption keys,
and set up the environment for first-time deployment.
"""

import os
import sys
from cryptography.fernet import Fernet
import secrets


def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def generate_encryption_key():
    """Generate a Fernet encryption key."""
    return Fernet.generate_key().decode()


def generate_secret_key():
    """Generate a Flask secret key."""
    return secrets.token_urlsafe(32)


def create_env_file():
    """Create .env file from template if it doesn't exist."""
    print_section("Environment Configuration")

    if os.path.exists('.env'):
        overwrite = input(".env file already exists. Overwrite? (y/N): ")
        if overwrite.lower() != 'y':
            print("Keeping existing .env file.")
            return False

    print("Creating .env file from template...")

    # Read template
    with open('.env.example', 'r') as f:
        content = f.read()

    # Generate keys
    print("Generating encryption keys...")
    flask_secret = generate_secret_key()
    encryption_key = generate_encryption_key()

    # Replace placeholders
    content = content.replace(
        'FLASK_SECRET_KEY=your-secret-key-here-change-this-in-production',
        f'FLASK_SECRET_KEY={flask_secret}'
    )
    content = content.replace(
        'ENCRYPTION_KEY=your_fernet_encryption_key_here',
        f'ENCRYPTION_KEY={encryption_key}'
    )

    # Write .env file
    with open('.env', 'w') as f:
        f.write(content)

    print("✓ .env file created successfully!")
    print("\n⚠️  IMPORTANT: Please edit .env and add your:")
    print("  - CLAUDE_API_KEY (from Anthropic)")
    print("  - DATABASE_URL (PostgreSQL connection string)")
    print("  - REDIS_URL (if using Redis)")
    print("  - STRIPE_SECRET_KEY (if using billing)")

    return True


def init_database():
    """Initialize the database tables."""
    print_section("Database Initialization")

    # Check if .env exists
    if not os.path.exists('.env'):
        print("⚠️  .env file not found. Please create it first.")
        return False

    try:
        # Load environment
        from dotenv import load_dotenv
        load_dotenv()

        # Import Flask app
        from proxy import app, db

        print("Creating database tables...")

        with app.app_context():
            db.create_all()
            print("✓ Database tables created successfully!")

        return True

    except Exception as e:
        print(f"✗ Error initializing database: {str(e)}")
        print("\nMake sure you have:")
        print("  1. PostgreSQL installed and running")
        print("  2. Correct DATABASE_URL in .env")
        print("  3. Installed dependencies: pip install -r requirements.txt")
        return False


def check_dependencies():
    """Check if all required dependencies are installed."""
    print_section("Dependency Check")

    try:
        import flask
        import flask_sqlalchemy
        import flask_login
        import flask_bcrypt
        import anthropic
        import redis
        import stripe
        print("✓ All required dependencies are installed!")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {str(e)}")
        print("\nPlease run: pip install -r requirements.txt")
        return False


def check_services():
    """Check if required services are running."""
    print_section("Service Check")

    services_ok = True

    # Check PostgreSQL
    try:
        from dotenv import load_dotenv
        load_dotenv()

        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            print("⚠️  DATABASE_URL not set in .env")
            services_ok = False
        else:
            # Try to connect
            from sqlalchemy import create_engine
            engine = create_engine(db_url)
            with engine.connect() as conn:
                print("✓ PostgreSQL is accessible")
    except Exception as e:
        print(f"✗ PostgreSQL connection failed: {str(e)}")
        print("  Please ensure PostgreSQL is running and DATABASE_URL is correct")
        services_ok = False

    # Check Redis (optional)
    redis_url = os.getenv('REDIS_URL')
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url)
            r.ping()
            print("✓ Redis is accessible")
        except Exception as e:
            print(f"⚠️  Redis connection failed: {str(e)}")
            print("  Redis is optional but recommended for production")
    else:
        print("ℹ️  Redis not configured (optional, using filesystem sessions)")

    return services_ok


def create_admin_user():
    """Create an admin user."""
    print_section("Admin User Creation")

    try:
        from dotenv import load_dotenv
        load_dotenv()

        from proxy import app, db
        from models import User, Billing
        from flask_bcrypt import Bcrypt

        bcrypt = Bcrypt()

        with app.app_context():
            email = input("Enter admin email: ")
            password = input("Enter admin password: ")

            # Check if user exists
            existing = User.query.filter_by(email=email).first()
            if existing:
                print(f"⚠️  User {email} already exists!")
                return False

            # Create user
            password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
            user = User(
                email=email,
                password_hash=password_hash,
                subscription_tier='enterprise',  # Give admin enterprise tier
                is_active=True,
                is_verified=True
            )

            db.session.add(user)
            db.session.flush()

            # Create billing record
            billing = Billing(user_id=user.id)
            db.session.add(billing)

            db.session.commit()

            print(f"✓ Admin user created: {email}")
            return True

    except Exception as e:
        print(f"✗ Error creating admin user: {str(e)}")
        return False


def main():
    """Main setup workflow."""
    print("""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                  Cursive Setup Wizard                      ║
║                                                            ║
║        AI-Powered Digital Notebook Setup Script            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)

    # Step 1: Check dependencies
    if not check_dependencies():
        print("\n❌ Setup cannot continue. Please install dependencies.")
        sys.exit(1)

    # Step 2: Create .env file
    create_env_file()
    print("\n⏸️  Please edit .env file with your configuration and then re-run this script.")
    print("   After editing .env, run: python setup.py --init-db")
    sys.exit(0)


def init_only():
    """Initialize database only (after .env is configured)."""
    print("""
╔════════════════════════════════════════════════════════════╗
║              Database Initialization                       ║
╚════════════════════════════════════════════════════════════╝
    """)

    # Check dependencies
    if not check_dependencies():
        sys.exit(1)

    # Check services
    if not check_services():
        print("\n⚠️  Some services are not available. Database initialization may fail.")
        proceed = input("Continue anyway? (y/N): ")
        if proceed.lower() != 'y':
            sys.exit(1)

    # Initialize database
    if not init_database():
        sys.exit(1)

    # Offer to create admin user
    create_admin = input("\nCreate an admin user? (Y/n): ")
    if create_admin.lower() != 'n':
        create_admin_user()

    print_section("Setup Complete!")
    print("✅ Cursive is ready to run!")
    print("\nNext steps:")
    print("  1. For development: python proxy.py")
    print("  2. For production: gunicorn wsgi:app --bind 0.0.0.0:5022 --workers 4")
    print("\nDocumentation: See SETUP.md for more details")


if __name__ == '__main__':
    if '--init-db' in sys.argv:
        init_only()
    else:
        main()
