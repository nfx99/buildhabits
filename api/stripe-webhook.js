import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Try to disable body parsing, but some platforms still parse it
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to get raw body
const getRawBody = (req) => {
  return new Promise((resolve, reject) => {
    let buffer = '';
    req.on('data', (chunk) => {
      buffer += chunk;
    });
    req.on('end', () => {
      resolve(buffer);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  console.log('Request body type:', typeof req.body);
  console.log('Request body exists:', !!req.body);
  console.log('Signature header exists:', !!sig);

  // Check if body is already parsed by the platform
  let rawBody;
  if (req.body && typeof req.body === 'object') {
    // Body is already parsed - convert back to string for signature verification
    rawBody = JSON.stringify(req.body);
    console.log('Body already parsed, converted to string, length:', rawBody.length);
  } else {
    // Try to get raw body
    try {
      rawBody = await getRawBody(req);
      console.log('Raw body received, length:', rawBody.length);
      console.log('Raw body type:', typeof rawBody);
    } catch (err) {
      console.error('Error reading raw body:', err);
    }
  }

  // Handle signature verification if possible
  if (process.env.STRIPE_WEBHOOK_SECRET && sig && rawBody && typeof rawBody === 'string' && !req.body) {
    // We have a raw body and signature - verify it
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('Event constructed successfully with signature verification:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // Body is already parsed by platform or no signature verification
    console.log('Skipping signature verification - using parsed body');
    if (typeof req.body === 'object' && req.body.type) {
      event = req.body;
      console.log('Using parsed body as event:', event.type);
    } else {
      return res.status(400).json({ message: 'Invalid webhook payload - no valid event found' });
    }
  }

  try {
    // Handle subscription checkout completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Processing completed checkout session:', {
        userId: session.client_reference_id,
        subscriptionId: session.subscription,
        sessionId: session.id,
        mode: session.mode
      });
      
      if (!session.client_reference_id) {
        console.error('No client_reference_id found in session');
        return res.status(400).json({ message: 'No user ID found in session' });
      }

      if (session.mode === 'subscription') {
        // Handle subscription checkout
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Create or update subscription record
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .upsert([
            {
              user_id: session.client_reference_id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer,
              status: subscription.status,
              current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
              current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
              plan_type: session.metadata?.planType || 'unknown',
              price_id: subscription.items.data[0]?.price?.id
            }
          ], {
            onConflict: 'stripe_subscription_id'
          })
          .select();

        if (subscriptionError) {
          console.error('Error creating subscription record:', subscriptionError);
          return res.status(500).json({ message: 'Error creating subscription record', error: subscriptionError });
        }

        console.log('Subscription record created/updated:', subscriptionData);

        // Update user profile to premium
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: session.client_reference_id,
              is_premium: true,
              premium_since: new Date().toISOString(),
              subscription_status: subscription.status
            },
            {
              onConflict: 'user_id'
            }
          )
          .select();

        if (profileError) {
          console.error('Error updating user profile:', profileError);
          return res.status(500).json({ message: 'Error updating user profile', error: profileError });
        }

        console.log('User profile updated to premium:', profileData);
      }
    }

    // Handle successful subscription payments
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      
      if (subscriptionId) {
        console.log('Processing successful subscription payment:', {
          subscriptionId,
          invoiceId: invoice.id,
          amount: invoice.amount_paid
        });

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Update subscription record
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
                        current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError);
          }

          // Ensure user profile is premium
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({
              is_premium: true,
              subscription_status: subscription.status
            })
            .eq('user_id', userId);

          if (profileError) {
            console.error('Error updating user profile:', profileError);
          }

          console.log('Subscription payment processed successfully');
        }
      }
    }

    // Handle subscription updates (cancellations, plan changes, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      console.log('Processing subscription update:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        userId
      });

      if (userId) {
        // Update subscription record
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
        }

        // Update user profile based on subscription status
        const isPremium = ['active', 'trialing'].includes(subscription.status);
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            is_premium: isPremium,
            subscription_status: subscription.status
          })
          .eq('user_id', userId);

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        }

        // If user lost premium status, delete excess habits
        if (!isPremium) {
          try {
            console.log('User lost premium status, deleting excess habits for user:', userId);
            
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
            console.error('Error in habit deletion process:', habitDeletionError);
          }
        }

        console.log('Subscription updated successfully');
      }
    }

    // Handle subscription deletions
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      console.log('Processing subscription deletion:', {
        subscriptionId: subscription.id,
        userId
      });

      if (userId) {
        // Update subscription record
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled'
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
        }

        // Remove premium status from user profile
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

        // Delete excess habits (keep only first 2) when user loses premium
        try {
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
          console.error('Error in habit deletion process:', habitDeletionError);
        }

        console.log('Subscription canceled successfully');
      }
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ message: 'Error processing webhook', error: error.message });
  }

  res.json({ received: true });
} 