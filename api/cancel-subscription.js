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

    console.log(`Canceling Stripe subscription: ${subscription.stripe_subscription_id}`);

    // Cancel subscription immediately via Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    // Immediately update user status and delete excess habits
    try {
      // Update user profile to remove premium status
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          is_premium: false,
          subscription_status: 'canceled'
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      }

      // Delete excess habits (keep only first 2)
      console.log('Deleting excess habits for user:', userId);
      
      // Get all user's habits, ordered by homepage order (top habits first)
      const { data: habits, error: fetchError } = await supabase
        .from('habits')
        .select('id, name, order')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('order', { ascending: true, nullsFirst: false });

              if (fetchError) {
          console.error('Error fetching habits for deletion:', fetchError);
        } else if (habits && habits.length > 2) {
          // Keep top 2 habits (as they appear on homepage), delete the rest
          const habitsToKeep = habits.slice(0, 2);
          const habitsToDelete = habits.slice(2);
          const habitIdsToDelete = habitsToDelete.map(h => h.id);
          
          console.log(`Keeping top 2 habits:`, habitsToKeep.map(h => h.name));
          console.log(`Deleting ${habitIdsToDelete.length} excess habits:`, habitsToDelete.map(h => h.name));
        
        // Delete habit completions first
        const { error: completionsError } = await supabase
          .from('habit_completions')
          .delete()
          .in('habit_id', habitIdsToDelete);

        if (completionsError) {
          console.error('Error deleting habit completions:', completionsError);
        }

        // Delete the habits
        const { error: habitsError } = await supabase
          .from('habits')
          .delete()
          .in('id', habitIdsToDelete);

        if (habitsError) {
          console.error('Error deleting excess habits:', habitsError);
        } else {
          console.log(`Successfully deleted ${habitIdsToDelete.length} excess habits`);
        }
      } else {
        console.log('User has 2 or fewer habits, no deletion needed');
      }
    } catch (habitDeletionError) {
      console.error('Error in immediate habit deletion process:', habitDeletionError);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Subscription canceled: ${canceledSubscription.id} (${duration}ms)`);

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