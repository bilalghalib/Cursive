/**
 * Stripe Webhook Handler - Supabase Edge Function
 *
 * Handles Stripe webhook events for subscription management
 * Replaces Flask billing.py webhook handling
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  try {
    const userId = session.metadata?.user_id
    const tier = session.metadata?.tier || 'pro'
    const subscriptionId = session.subscription as string

    if (!userId) {
      console.error('Missing user_id in checkout session metadata')
      return
    }

    // Get subscription details from Stripe to get correct billing period
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Update user_settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .update({ subscription_tier: tier })
      .eq('user_id', userId)

    if (settingsError) {
      console.error('Error updating user settings:', settingsError)
    }

    // Update or create billing record
    const { error: billingError } = await supabase
      .from('billing')
      .upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        tokens_used_this_period: 0,
      })

    if (billingError) {
      console.error('Error updating billing:', billingError)
    }

    console.log(` Subscription activated for user ${userId}: ${tier}`)
  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(
  supabase: any,
  subscription: Stripe.Subscription
) {
  try {
    const { error } = await supabase
      .from('billing')
      .update({
        subscription_status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription:', error)
    }

    console.log(` Subscription updated: ${subscription.id}`)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  try {
    // Get billing record
    const { data: billing } = await supabase
      .from('billing')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (!billing) {
      console.error('Billing record not found for subscription:', subscription.id)
      return
    }

    // Update user settings to free tier
    await supabase
      .from('user_settings')
      .update({ subscription_tier: 'free' })
      .eq('user_id', billing.user_id)

    // Update billing record
    await supabase
      .from('billing')
      .update({
        subscription_status: 'canceled',
        stripe_subscription_id: null,
      })
      .eq('stripe_subscription_id', subscription.id)

    console.log(` Subscription canceled: ${subscription.id}`)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  try {
    const customerId = invoice.customer as string

    const { error } = await supabase
      .from('billing')
      .update({ subscription_status: 'past_due' })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error updating payment status:', error)
    }

    console.log(`  Payment failed for customer: ${customerId}`)
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

/**
 * Main webhook handler
 */
serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get raw body for signature verification
    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`=è Received Stripe webhook: ${event.type}`)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
