"""
Database models for Cursive application.

This module defines all SQLAlchemy models for users, notebooks, drawings,
API usage tracking, and billing.
"""

from database import db
from datetime import datetime, timezone
from flask_login import UserMixin
from sqlalchemy import JSON, Text, Index
from cryptography.fernet import Fernet
import os
import logging

logger = logging.getLogger(__name__)


class User(UserMixin, db.Model):
    """
    User model for authentication and account management.

    Attributes:
        id: Primary key
        email: User's email address (unique)
        password_hash: Bcrypt hashed password
        encrypted_api_key: User's own Anthropic API key (encrypted, optional)
        subscription_tier: free, pro, or enterprise
        stripe_customer_id: Stripe customer ID for billing
        is_active: Whether account is active
        is_verified: Whether email is verified
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    encrypted_api_key = db.Column(db.Text, nullable=True)
    subscription_tier = db.Column(
        db.String(20),
        default='free',
        nullable=False
    )  # free, pro, enterprise
    stripe_customer_id = db.Column(db.String(255), nullable=True, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    notebooks = db.relationship('Notebook', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    api_usage = db.relationship('APIUsage', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    billing = db.relationship('Billing', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_api_key(self, api_key):
        """
        Encrypt and store user's Anthropic API key.

        Args:
            api_key: Plain text API key
        """
        if api_key:
            encryption_key = os.getenv('ENCRYPTION_KEY')
            if not encryption_key:
                raise ValueError("ENCRYPTION_KEY not set in environment")

            try:
                fernet = Fernet(encryption_key.encode())
                self.encrypted_api_key = fernet.encrypt(api_key.encode()).decode()
            except Exception as e:
                logger.error(f"Invalid ENCRYPTION_KEY: {str(e)}")
                raise ValueError("Invalid encryption key configuration")

    def get_api_key(self):
        """
        Decrypt and return user's Anthropic API key.

        Returns:
            str: Decrypted API key or None
        """
        if not self.encrypted_api_key:
            return None

        encryption_key = os.getenv('ENCRYPTION_KEY')
        if not encryption_key:
            raise ValueError("ENCRYPTION_KEY not set in environment")

        try:
            fernet = Fernet(encryption_key.encode())
            return fernet.decrypt(self.encrypted_api_key.encode()).decode()
        except Exception as e:
            logger.error(f"Error decrypting API key: {str(e)}")
            return None

    def to_dict(self):
        """Convert user object to dictionary."""
        return {
            'id': self.id,
            'email': self.email,
            'subscription_tier': self.subscription_tier,
            'has_own_api_key': bool(self.encrypted_api_key),
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat(),
        }


class Notebook(db.Model):
    """
    Notebook model representing a collection of drawings.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        title: Notebook title
        description: Optional description
        is_shared: Whether notebook is shared publicly
        share_id: UUID for public sharing
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = 'notebooks'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_shared = db.Column(db.Boolean, default=False, nullable=False)
    share_id = db.Column(db.String(36), unique=True, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    drawings = db.relationship('Drawing', backref='notebook', lazy='dynamic', cascade='all, delete-orphan')

    # Indexes
    __table_args__ = (
        Index('idx_user_updated', 'user_id', 'updated_at'),
    )

    def to_dict(self, include_drawings=False):
        """Convert notebook object to dictionary."""
        result = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'is_shared': self.is_shared,
            'share_id': self.share_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        if include_drawings:
            result['drawings'] = [d.to_dict() for d in self.drawings.all()]

        return result


class Drawing(db.Model):
    """
    Drawing model representing canvas stroke data and AI interactions.

    Attributes:
        id: Primary key
        notebook_id: Foreign key to Notebook
        stroke_data: JSON containing drawing strokes
        transcription: OCR text from handwriting
        ai_response: AI's response text
        drawing_type: handwriting, typed, or shape
        canvas_state: JSON containing canvas metadata (zoom, pan, etc.)
        created_at: Creation timestamp
    """
    __tablename__ = 'drawings'

    id = db.Column(db.Integer, primary_key=True)
    notebook_id = db.Column(db.Integer, db.ForeignKey('notebooks.id'), nullable=False, index=True)
    stroke_data = db.Column(JSON, nullable=True)
    transcription = db.Column(db.Text, nullable=True)
    ai_response = db.Column(db.Text, nullable=True)
    drawing_type = db.Column(
        db.String(20),
        default='handwriting',
        nullable=False
    )  # handwriting, typed, shape
    canvas_state = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    def to_dict(self):
        """Convert drawing object to dictionary."""
        return {
            'id': self.id,
            'notebook_id': self.notebook_id,
            'stroke_data': self.stroke_data,
            'transcription': self.transcription,
            'ai_response': self.ai_response,
            'drawing_type': self.drawing_type,
            'canvas_state': self.canvas_state,
            'created_at': self.created_at.isoformat(),
        }


class APIUsage(db.Model):
    """
    API usage tracking for billing and analytics.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        tokens_used: Number of tokens consumed
        tokens_input: Input tokens
        tokens_output: Output tokens
        cost: Calculated cost in USD
        model: AI model used
        endpoint: API endpoint called
        created_at: Request timestamp
    """
    __tablename__ = 'api_usage'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    tokens_used = db.Column(db.Integer, nullable=False)
    tokens_input = db.Column(db.Integer, nullable=False, default=0)
    tokens_output = db.Column(db.Integer, nullable=False, default=0)
    cost = db.Column(db.Numeric(10, 6), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    endpoint = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_user_created', 'user_id', 'created_at'),
    )

    def to_dict(self):
        """Convert API usage object to dictionary."""
        return {
            'id': self.id,
            'tokens_used': self.tokens_used,
            'tokens_input': self.tokens_input,
            'tokens_output': self.tokens_output,
            'cost': float(self.cost),
            'model': self.model,
            'endpoint': self.endpoint,
            'created_at': self.created_at.isoformat(),
        }


class Billing(db.Model):
    """
    Billing information and subscription status.

    Attributes:
        id: Primary key
        user_id: Foreign key to User (one-to-one)
        stripe_customer_id: Stripe customer ID
        stripe_subscription_id: Stripe subscription ID
        subscription_status: active, canceled, past_due, etc.
        current_period_start: Billing period start
        current_period_end: Billing period end
        tokens_used_this_period: Token usage for current billing period
        created_at: Record creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = 'billing'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)
    stripe_customer_id = db.Column(db.String(255), nullable=True, unique=True)
    stripe_subscription_id = db.Column(db.String(255), nullable=True, unique=True)
    subscription_status = db.Column(
        db.String(50),
        default='inactive',
        nullable=False
    )  # active, canceled, past_due, trialing, etc.
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    tokens_used_this_period = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def to_dict(self):
        """Convert billing object to dictionary."""
        return {
            'id': self.id,
            'subscription_status': self.subscription_status,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'tokens_used_this_period': self.tokens_used_this_period,
        }
