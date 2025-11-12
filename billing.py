"""
Billing module for Cursive application.

This module handles Stripe integration, subscription management,
usage tracking, and payment processing.
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from database import db
from models import User, Billing, APIUsage
import stripe
import os
import logging
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

# Create billing blueprint
billing_bp = Blueprint('billing', __name__, url_prefix='/api/billing')


def init_billing(app):
    """
    Initialize billing with Flask app and Stripe.

    Args:
        app: Flask application instance
    """
    stripe_key = os.getenv('STRIPE_SECRET_KEY')
    if stripe_key:
        stripe.api_key = stripe_key
        logger.info("Stripe integration initialized")
    else:
        logger.warning("STRIPE_SECRET_KEY not set - billing features disabled")

    app.register_blueprint(billing_bp)


def calculate_cost(tokens_input, tokens_output, model='claude-3-5-sonnet-20241022'):
    """
    Calculate cost for API usage based on tokens.

    Args:
        tokens_input: Number of input tokens
        tokens_output: Number of output tokens
        model: Model name

    Returns:
        Decimal: Total cost in USD
    """
    # Get pricing from environment (per 1K tokens)
    input_price = Decimal(os.getenv('ANTHROPIC_INPUT_PRICE', '0.003'))
    output_price = Decimal(os.getenv('ANTHROPIC_OUTPUT_PRICE', '0.015'))
    markup = Decimal(os.getenv('MARKUP_PERCENTAGE', '15')) / 100

    # Calculate base cost
    input_cost = (Decimal(tokens_input) / 1000) * input_price
    output_cost = (Decimal(tokens_output) / 1000) * output_price
    base_cost = input_cost + output_cost

    # Apply markup for non-BYOK users
    total_cost = base_cost * (1 + markup)

    return round(total_cost, 6)


def track_usage(user_id, tokens_input, tokens_output, model, endpoint):
    """
    Track API usage for billing.

    Args:
        user_id: User's ID
        tokens_input: Number of input tokens
        tokens_output: Number of output tokens
        model: Model name
        endpoint: API endpoint called

    Returns:
        APIUsage: Created usage record
    """
    try:
        # Calculate cost
        cost = calculate_cost(tokens_input, tokens_output, model)
        total_tokens = tokens_input + tokens_output

        # Create usage record
        usage = APIUsage(
            user_id=user_id,
            tokens_used=total_tokens,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            cost=cost,
            model=model,
            endpoint=endpoint
        )
        db.session.add(usage)

        # Update billing period usage
        billing = Billing.query.filter_by(user_id=user_id).first()
        if billing:
            billing.tokens_used_this_period += total_tokens
            billing.updated_at = datetime.utcnow()

        db.session.commit()

        logger.info(
            f"Usage tracked for user {user_id}: "
            f"{total_tokens} tokens, ${float(cost):.6f}"
        )

        return usage

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error tracking usage: {str(e)}")
        return None


@billing_bp.route('/usage', methods=['GET'])
@login_required
def get_usage():
    """
    Get user's API usage statistics.

    Query params:
        period: 'current', 'last_30_days', 'all_time' (default: 'current')

    Returns:
        JSON response with usage data
    """
    try:
        period = request.args.get('period', 'current')

        billing = Billing.query.filter_by(user_id=current_user.id).first()

        if period == 'current':
            # Current billing period
            if billing and billing.current_period_start:
                usage_records = APIUsage.query.filter(
                    APIUsage.user_id == current_user.id,
                    APIUsage.created_at >= billing.current_period_start
                ).all()
            else:
                usage_records = []

            return jsonify({
                "success": True,
                "period": "current",
                "tokens_used": billing.tokens_used_this_period if billing else 0,
                "records": [u.to_dict() for u in usage_records]
            }), 200

        elif period == 'last_30_days':
            # Last 30 days
            start_date = datetime.utcnow() - timedelta(days=30)
            usage_records = APIUsage.query.filter(
                APIUsage.user_id == current_user.id,
                APIUsage.created_at >= start_date
            ).all()

            total_tokens = sum(u.tokens_used for u in usage_records)
            total_cost = sum(float(u.cost) for u in usage_records)

            return jsonify({
                "success": True,
                "period": "last_30_days",
                "tokens_used": total_tokens,
                "total_cost": total_cost,
                "records": [u.to_dict() for u in usage_records]
            }), 200

        else:  # all_time
            usage_records = APIUsage.query.filter_by(
                user_id=current_user.id
            ).all()

            total_tokens = sum(u.tokens_used for u in usage_records)
            total_cost = sum(float(u.cost) for u in usage_records)

            return jsonify({
                "success": True,
                "period": "all_time",
                "tokens_used": total_tokens,
                "total_cost": total_cost,
                "record_count": len(usage_records)
            }), 200

    except Exception as e:
        logger.error(f"Error getting usage: {str(e)}")
        return jsonify({"error": "Failed to retrieve usage data"}), 500


@billing_bp.route('/subscription', methods=['GET'])
@login_required
def get_subscription():
    """
    Get user's subscription information.

    Returns:
        JSON response with subscription data
    """
    try:
        billing = Billing.query.filter_by(user_id=current_user.id).first()

        if not billing:
            return jsonify({
                "success": True,
                "subscription": None,
                "tier": current_user.subscription_tier
            }), 200

        return jsonify({
            "success": True,
            "subscription": billing.to_dict(),
            "tier": current_user.subscription_tier
        }), 200

    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        return jsonify({"error": "Failed to retrieve subscription data"}), 500


@billing_bp.route('/create-checkout-session', methods=['POST'])
@login_required
def create_checkout_session():
    """
    Create a Stripe checkout session for subscription.

    Request body:
        {
            "tier": "pro" or "enterprise"
        }

    Returns:
        JSON response with checkout session URL
    """
    try:
        data = request.get_json()
        tier = data.get('tier', 'pro')

        if tier not in ['pro', 'enterprise']:
            return jsonify({"error": "Invalid subscription tier"}), 400

        # Get or create Stripe customer
        billing = Billing.query.filter_by(user_id=current_user.id).first()

        if not billing:
            billing = Billing(user_id=current_user.id)
            db.session.add(billing)
            db.session.commit()

        if not billing.stripe_customer_id:
            # Create Stripe customer
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={'user_id': current_user.id}
            )
            billing.stripe_customer_id = customer.id
            db.session.commit()
        else:
            customer_id = billing.stripe_customer_id

        # Create checkout session
        # Note: You need to create these price IDs in your Stripe dashboard
        if tier == 'pro':
            price_id = os.getenv('STRIPE_PRO_PRICE_ID')
        else:
            price_id = os.getenv('STRIPE_ENTERPRISE_PRICE_ID')

        if not price_id:
            return jsonify({
                "error": f"Stripe price ID not configured for {tier} tier"
            }), 500

        checkout_session = stripe.checkout.Session.create(
            customer=billing.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=request.host_url + 'billing/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.host_url + 'billing/cancel',
            metadata={
                'user_id': current_user.id,
                'tier': tier
            }
        )

        return jsonify({
            "success": True,
            "checkout_url": checkout_session.url
        }), 200

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return jsonify({"error": "Payment processing error"}), 500
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        return jsonify({"error": "Failed to create checkout session"}), 500


@billing_bp.route('/cancel-subscription', methods=['POST'])
@login_required
def cancel_subscription():
    """
    Cancel user's subscription.

    Returns:
        JSON response confirming cancellation
    """
    try:
        billing = Billing.query.filter_by(user_id=current_user.id).first()

        if not billing or not billing.stripe_subscription_id:
            return jsonify({"error": "No active subscription found"}), 404

        # Cancel subscription in Stripe
        stripe.Subscription.modify(
            billing.stripe_subscription_id,
            cancel_at_period_end=True
        )

        billing.subscription_status = 'canceling'
        db.session.commit()

        logger.info(f"Subscription canceled for user {current_user.id}")

        return jsonify({
            "success": True,
            "message": "Subscription will be canceled at period end"
        }), 200

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return jsonify({"error": "Failed to cancel subscription"}), 500
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        return jsonify({"error": "Failed to cancel subscription"}), 500


@billing_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """
    Handle Stripe webhook events.

    This endpoint is called by Stripe to notify about subscription changes,
    payment successes/failures, etc.
    """
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        return jsonify({"error": "Invalid signature"}), 400

    # Handle different event types
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            handle_checkout_completed(session)

        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            handle_subscription_updated(subscription)

        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            handle_subscription_deleted(subscription)

        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            handle_payment_failed(invoice)

        return jsonify({"success": True}), 200

    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        return jsonify({"error": "Webhook processing failed"}), 500


def handle_checkout_completed(session):
    """Handle successful checkout."""
    user_id = session['metadata']['user_id']
    tier = session['metadata']['tier']
    subscription_id = session['subscription']

    billing = Billing.query.filter_by(user_id=user_id).first()
    user = User.query.get(user_id)

    if billing and user:
        billing.stripe_subscription_id = subscription_id
        billing.subscription_status = 'active'
        billing.current_period_start = datetime.utcnow()
        billing.current_period_end = datetime.utcnow() + timedelta(days=30)
        billing.tokens_used_this_period = 0

        user.subscription_tier = tier

        db.session.commit()
        logger.info(f"Subscription activated for user {user_id}: {tier}")


def handle_subscription_updated(subscription):
    """Handle subscription update."""
    billing = Billing.query.filter_by(
        stripe_subscription_id=subscription['id']
    ).first()

    if billing:
        billing.subscription_status = subscription['status']
        db.session.commit()
        logger.info(f"Subscription updated: {subscription['id']}")


def handle_subscription_deleted(subscription):
    """Handle subscription cancellation."""
    billing = Billing.query.filter_by(
        stripe_subscription_id=subscription['id']
    ).first()

    if billing:
        user = User.query.get(billing.user_id)
        if user:
            user.subscription_tier = 'free'

        billing.subscription_status = 'canceled'
        billing.stripe_subscription_id = None
        db.session.commit()
        logger.info(f"Subscription canceled: {subscription['id']}")


def handle_payment_failed(invoice):
    """Handle failed payment."""
    customer_id = invoice['customer']
    billing = Billing.query.filter_by(stripe_customer_id=customer_id).first()

    if billing:
        billing.subscription_status = 'past_due'
        db.session.commit()
        logger.warning(f"Payment failed for customer {customer_id}")
