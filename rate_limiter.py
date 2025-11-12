"""
Rate limiting module for Cursive application.

This module provides Redis-based rate limiting to prevent abuse
and control API usage costs.
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import request, jsonify
from flask_login import current_user
import os
import logging

logger = logging.getLogger(__name__)

# Initialize limiter
limiter = None


def get_user_id_for_rate_limit():
    """
    Get identifier for rate limiting.

    Returns user ID if authenticated, otherwise IP address.

    Returns:
        str: User ID or IP address
    """
    if current_user.is_authenticated:
        return f"user:{current_user.id}"
    return f"ip:{get_remote_address()}"


def init_rate_limiter(app):
    """
    Initialize rate limiter with Flask app.

    Args:
        app: Flask application instance

    Returns:
        Limiter: Configured limiter instance
    """
    global limiter

    # Check if rate limiting is enabled
    rate_limit_enabled = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'

    if not rate_limit_enabled:
        logger.warning("Rate limiting is DISABLED")
        # Return a dummy limiter that doesn't actually limit
        limiter = Limiter(
            app=app,
            key_func=get_user_id_for_rate_limit,
            storage_uri="memory://",
            enabled=False
        )
        return limiter

    # Get Redis URL from environment
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    # Get rate limit settings from environment
    per_minute = os.getenv('RATE_LIMIT_PER_MINUTE', '50')
    per_day = os.getenv('RATE_LIMIT_PER_DAY', '500')

    # Initialize limiter with Redis storage
    limiter = Limiter(
        app=app,
        key_func=get_user_id_for_rate_limit,
        storage_uri=redis_url,
        default_limits=[f"{per_minute} per minute", f"{per_day} per day"],
        # Custom error message
        headers_enabled=True,
    )

    # Custom error handler for rate limit exceeded
    @app.errorhandler(429)
    def ratelimit_handler(e):
        """Handle rate limit exceeded errors."""
        logger.warning(
            f"Rate limit exceeded for {get_user_id_for_rate_limit()} "
            f"on {request.endpoint}"
        )
        return jsonify({
            "error": "Rate limit exceeded",
            "message": "You have made too many requests. Please try again later.",
            "retry_after": e.description
        }), 429

    logger.info(f"Rate limiting initialized: {per_minute}/min, {per_day}/day")

    return limiter


def check_usage_quota(user):
    """
    Check if user has exceeded their usage quota for the current billing period.

    Args:
        user: User object

    Returns:
        tuple: (bool, str) - (has_quota, error_message)
    """
    from models import Billing

    # Users with their own API key have unlimited quota
    if user.get_api_key():
        return True, None

    # Get user's billing info
    billing = Billing.query.filter_by(user_id=user.id).first()

    if not billing:
        return False, "Billing information not found"

    # Free tier: 10,000 tokens per month
    free_tier_limit = int(os.getenv('FREE_TIER_TOKENS_PER_MONTH', '10000'))

    # Pro tier: 50,000 tokens included
    pro_tier_limit = int(os.getenv('PRO_TIER_INCLUDED_TOKENS', '50000'))

    # Determine quota based on subscription tier
    if user.subscription_tier == 'free':
        quota = free_tier_limit
    elif user.subscription_tier == 'pro':
        quota = pro_tier_limit
    elif user.subscription_tier == 'enterprise':
        # Enterprise users have unlimited quota
        return True, None
    else:
        quota = free_tier_limit

    # Check if user has exceeded quota
    if billing.tokens_used_this_period >= quota:
        return False, (
            f"You have exceeded your monthly token quota of {quota:,}. "
            f"Please upgrade your plan or add your own API key."
        )

    return True, None


def exempt_from_rate_limit():
    """
    Check if current request should be exempt from rate limiting.

    Enterprise users and users with their own API keys are exempt.

    Returns:
        bool: True if exempt, False otherwise
    """
    if current_user.is_authenticated:
        # Enterprise users are exempt
        if current_user.subscription_tier == 'enterprise':
            return True

        # Users with their own API key are exempt (they pay directly to Anthropic)
        if current_user.get_api_key():
            return True

    return False


# Custom decorators for specific rate limits
def ai_request_limit(f):
    """
    Custom rate limit decorator for AI requests.

    Applies stricter limits to expensive AI endpoints.
    """
    # Exempt certain users from rate limiting
    if exempt_from_rate_limit():
        return f

    # Apply stricter limit for AI requests
    per_minute = int(os.getenv('RATE_LIMIT_PER_MINUTE', '50')) // 2  # Half the normal rate
    limit_string = f"{per_minute} per minute"

    decorator = limiter.limit(limit_string)
    return decorator(f)


def check_quota_middleware():
    """
    Middleware to check usage quota before processing AI requests.

    Returns 429 if quota exceeded.
    """
    # Only check quota for authenticated AI requests
    if (current_user.is_authenticated and
        request.endpoint in ['handle_claude_request', 'handle_claude_stream_request']):

        has_quota, error_msg = check_usage_quota(current_user)

        if not has_quota:
            logger.warning(f"Quota exceeded for user {current_user.id}: {error_msg}")
            return jsonify({
                "error": "Quota exceeded",
                "message": error_msg
            }), 429

    return None
