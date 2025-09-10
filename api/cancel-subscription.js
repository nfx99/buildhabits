import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with optimized configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 2,
  timeout: 8000, // 8 second timeout
});

// Initialize Supabase client with multiple naming convention support
let supabase;
let initializationError = null;

try {
  // Try ALL possible environment variable names (frontend + backend)
  let supabaseUrl = process.env.REACT_APP_SUPABASE_URL ||      // Frontend naming
                    process.env.NEXT_PUBLIC_SUPABASE_URL ||    // Next.js naming  
                    process.env.SUPABASE_URL;                  // Generic naming
                    
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||    // Backend service key
                   process.env.REACT_APP_SUPABASE_SERVICE_KEY; // Alternate naming
  
  
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL not found (tried REACT_APP_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL)');
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  
  supabase = createClient(supabaseUrl, serviceKey);
} catch (supabaseError) {
  console.error('Supabase initialization error:', supabaseError);
  initializationError = supabaseError.message;
}

export default async function handler(req, res) {
  // Set performance headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // Check if Supabase is properly initialized
    if (!supabase) {
      console.error('Supabase not initialized');
      return res.status(500).json({ 
        message: 'Database connection not configured'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }

    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ message: 'Payment system not configured' });
    }

    console.log(`Cancel subscription request for user: ${userId}`);

    // Get user's current subscription from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return res.status(500).json({ message: 'Failed to fetch subscription' });
    }

    if (!subscription?.stripe_subscription_id) {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    console.log(`Scheduling cancellation at period end for Stripe subscription: ${subscription.stripe_subscription_id}`);

    // Schedule cancellation at the end of the current billing period
    const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update user profile to show subscription is scheduled for cancellation (but still premium)
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'cancel_at_period_end',
          cancel_at: new Date(updatedSubscription.cancel_at * 1000).toISOString()
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      }

      console.log(`Subscription will be canceled at: ${new Date(updatedSubscription.cancel_at * 1000).toISOString()}`);

    } catch (error) {
      console.error('Error updating subscription status:', error);
      return res.status(500).json({ message: 'Failed to schedule subscription cancellation' });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Subscription scheduled for cancellation: ${updatedSubscription.id} (${duration}ms)`);

    res.status(200).json({ 
      message: 'Subscription will be canceled at the end of your current billing period. You will retain premium access until then.',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        cancel_at: new Date(updatedSubscription.cancel_at * 1000).toISOString(),
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString()
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`Cancel subscription error (${duration}ms):`, error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        message: 'Invalid subscription or already canceled',
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to cancel subscription',
      error: error.message 
    });
  }
} 