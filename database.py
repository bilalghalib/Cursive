"""
Database configuration and initialization for Cursive.

This module sets up the SQLAlchemy database connection and provides
utilities for database operations.
"""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
import logging

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


# Initialize SQLAlchemy with custom base class
db = SQLAlchemy(model_class=Base)


def init_db(app):
    """
    Initialize the database with the Flask app.

    Args:
        app: Flask application instance
    """
    # Configure database
    db.init_app(app)

    with app.app_context():
        # Import models to ensure they're registered
        from models import User, Notebook, Drawing, APIUsage, Billing

        # Create all tables
        db.create_all()
        logger.info("Database tables created successfully")


def check_db_connection():
    """
    Check if database connection is healthy.

    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        # Try to execute a simple query
        db.session.execute(db.text('SELECT 1'))
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False
