"""
Authentication module for Cursive application.

This module handles user registration, login, logout, session management,
and JWT token generation.
"""

from flask import Blueprint, request, jsonify, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from marshmallow import Schema, fields, ValidationError, validate
from database import db
from models import User, Billing
import jwt
import datetime
import os
import logging
import re

logger = logging.getLogger(__name__)

# Initialize extensions
bcrypt = Bcrypt()
login_manager = LoginManager()

# Create auth blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# Validation Schemas
class RegisterSchema(Schema):
    """Schema for user registration validation."""
    email = fields.Email(required=True)
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8, max=128),
    )


class LoginSchema(Schema):
    """Schema for login validation."""
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class UpdateAPIKeySchema(Schema):
    """Schema for API key update validation."""
    api_key = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=500)
    )


def init_auth(app):
    """
    Initialize authentication with Flask app.

    Args:
        app: Flask application instance
    """
    bcrypt.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.session_protection = 'strong'

    app.register_blueprint(auth_bp)


@login_manager.user_loader
def load_user(user_id):
    """
    Load user by ID for Flask-Login.

    Args:
        user_id: User's ID

    Returns:
        User object or None
    """
    return User.query.get(int(user_id))


def validate_email(email):
    """
    Validate email format.

    Args:
        email: Email address to validate

    Returns:
        bool: True if valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password_strength(password):
    """
    Validate password strength.

    Args:
        password: Password to validate

    Returns:
        tuple: (bool, str) - (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"

    return True, ""


def generate_token(user_id):
    """
    Generate JWT token for user.

    Args:
        user_id: User's ID

    Returns:
        str: JWT token
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow()
    }

    secret_key = os.getenv('FLASK_SECRET_KEY')
    if not secret_key:
        raise ValueError("FLASK_SECRET_KEY not set in environment")

    return jwt.encode(payload, secret_key, algorithm='HS256')


def verify_token(token):
    """
    Verify JWT token and return user_id.

    Args:
        token: JWT token

    Returns:
        int: User ID or None if invalid
    """
    try:
        secret_key = os.getenv('FLASK_SECRET_KEY')
        if not secret_key:
            raise ValueError("FLASK_SECRET_KEY not set in environment")

        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user.

    Request body:
        {
            "email": "user@example.com",
            "password": "SecurePass123"
        }

    Returns:
        JSON response with user data and token
    """
    try:
        # Validate request data
        schema = RegisterSchema()
        data = schema.load(request.get_json())

        email = data['email'].lower().strip()
        password = data['password']

        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "Email already registered"}), 400

        # Validate password strength
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            return jsonify({"error": error_msg}), 400

        # Create new user
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(
            email=email,
            password_hash=password_hash,
            subscription_tier='free'
        )

        db.session.add(user)
        db.session.flush()  # Get user.id

        # Create billing record
        billing = Billing(user_id=user.id)
        db.session.add(billing)

        db.session.commit()

        # Log in the user
        login_user(user)

        # Generate token
        token = generate_token(user.id)

        logger.info(f"New user registered: {email}")

        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "token": token
        }), 201

    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": "An error occurred during registration"}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Log in an existing user.

    Request body:
        {
            "email": "user@example.com",
            "password": "SecurePass123"
        }

    Returns:
        JSON response with user data and token
    """
    try:
        # Validate request data
        schema = LoginSchema()
        data = schema.load(request.get_json())

        email = data['email'].lower().strip()
        password = data['password']

        # Find user
        user = User.query.filter_by(email=email).first()

        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401

        if not user.is_active:
            return jsonify({"error": "Account is deactivated"}), 403

        # Log in the user
        login_user(user, remember=True)

        # Generate token
        token = generate_token(user.id)

        logger.info(f"User logged in: {email}")

        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "token": token
        }), 200

    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "An error occurred during login"}), 500


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """
    Log out the current user.

    Returns:
        JSON response confirming logout
    """
    logout_user()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """
    Get current user information.

    Returns:
        JSON response with user data
    """
    return jsonify({
        "success": True,
        "user": current_user.to_dict()
    }), 200


@auth_bp.route('/api-key', methods=['PUT'])
@login_required
def update_api_key():
    """
    Update user's Anthropic API key (BYOK - Bring Your Own Key).

    Request body:
        {
            "api_key": "sk-ant-..."
        }

    Returns:
        JSON response confirming update
    """
    try:
        # Validate request data
        schema = UpdateAPIKeySchema()
        data = schema.load(request.get_json())

        api_key = data['api_key'].strip()

        # Basic validation that it looks like an Anthropic key
        if not api_key.startswith('sk-ant-'):
            return jsonify({
                "error": "Invalid API key format. Should start with 'sk-ant-'"
            }), 400

        # Encrypt and store the API key
        current_user.set_api_key(api_key)
        db.session.commit()

        logger.info(f"User {current_user.email} updated API key")

        return jsonify({
            "success": True,
            "message": "API key updated successfully"
        }), 200

    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"API key update error: {str(e)}")
        return jsonify({"error": "An error occurred while updating API key"}), 500


@auth_bp.route('/api-key', methods=['DELETE'])
@login_required
def delete_api_key():
    """
    Delete user's Anthropic API key.

    Returns:
        JSON response confirming deletion
    """
    try:
        current_user.encrypted_api_key = None
        db.session.commit()

        logger.info(f"User {current_user.email} deleted API key")

        return jsonify({
            "success": True,
            "message": "API key deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"API key deletion error: {str(e)}")
        return jsonify({"error": "An error occurred while deleting API key"}), 500


def require_auth_or_token(f):
    """
    Decorator to require either session auth or JWT token.

    This allows API endpoints to be accessed either via session
    (for web frontend) or JWT token (for API clients).
    """
    def decorated_function(*args, **kwargs):
        # Check if user is logged in via session
        if current_user.is_authenticated:
            return f(*args, **kwargs)

        # Check for JWT token in Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_id = verify_token(token)

            if user_id:
                user = User.query.get(user_id)
                if user and user.is_active:
                    login_user(user)
                    return f(*args, **kwargs)

        return jsonify({"error": "Authentication required"}), 401

    decorated_function.__name__ = f.__name__
    return decorated_function
