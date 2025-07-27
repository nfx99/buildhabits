import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with optimized configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 2,
  timeout: 8000, // 8 second timeout
});

// TEMPORARY: Initialize Supabase client with environment variable bypass
let supabase;
let initializationError = null;

try {
  // Try ALL possible environment variable names (frontend + backend)
  let supabaseUrl = process.env.REACT_APP_SUPABASE_URL ||      // Frontend naming
                    process.env.NEXT_PUBLIC_SUPABASE_URL ||    // Next.js naming  
                    process.env.SUPABASE_URL;                  // Generic naming
                    
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||    // Backend service key
                   process.env.REACT_APP_SUPABASE_SERVICE_KEY; // Alternate naming
  
  console.log('🔍 Supabase init attempt with all naming conventions:', {
    reactAppUrl: !!process.env.REACT_APP_SUPABASE_URL,
    nextPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    genericUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!serviceKey,
    finalUrl: !!supabaseUrl,
    urlSource: process.env.REACT_APP_SUPABASE_URL ? 'REACT_APP_SUPABASE_URL' :
               process.env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 
               process.env.SUPABASE_URL ? 'SUPABASE_URL' : 'NONE'
  });
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL not found (tried REACT_APP_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL)');
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  
  supabase = createClient(supabaseUrl, serviceKey);
  console.log('✅ Supabase client initialized successfully');
} catch (supabaseError) {
  console.error('❌ Supabase initialization error:', supabaseError);
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
    // Debug environment variables
    console.log('🔍 DEBUG: Environment check in cancel-subscription:');
    console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    
    // Check if Supabase is properly initialized
    if (!supabase) {
      console.error('Supabase not initialized');
      console.error('Initialization error:', initializationError);
      return res.status(500).json({ 
        message: 'Database connection not configured',
        error: initializationError,
        debug: {
          hasSupabaseUrl: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          initError: initializationError
        }
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

    console.log(`Canceling Stripe subscription: ${subscription.stripe_subscription_id}`);

    // Cancel subscription immediately via Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Subscription canceled: ${canceledSubscription.id} (${duration}ms)`);

    // The webhook will handle updating the database when the cancellation event comes through
    res.status(200).json({ 
      message: 'Subscription canceled successfully',
      subscriptionId: canceledSubscription.id,
      canceled_at: canceledSubscription.canceled_at
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