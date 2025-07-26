import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with optimized configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 2,
  timeout: 8000, // 8 second timeout
});

// Initialize Supabase client
let supabase;
try {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} catch (supabaseError) {
  console.error('Supabase initialization error:', supabaseError);
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
      return res.status(500).json({ message: 'Database connection not configured' });
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
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_id, subscription_status')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(500).json({ message: 'Failed to fetch user profile' });
    }

    if (!userProfile?.subscription_id) {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    if (userProfile.subscription_status !== 'active') {
      return res.status(400).json({ message: 'Subscription is not active' });
    }

    console.log(`Canceling Stripe subscription: ${userProfile.subscription_id}`);

    // Cancel subscription immediately via Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(userProfile.subscription_id);

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