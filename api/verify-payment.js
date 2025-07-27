import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('Verifying subscription for session:', sessionId, 'user:', userId);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Stripe session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      client_reference_id: session.client_reference_id,
      mode: session.mode,
      subscription: session.subscription
    });

    // Check if session was successful and user ID matches
    if (session.payment_status === 'paid' && session.client_reference_id === userId) {
      console.log('Session confirmed by Stripe, processing subscription...');
      
      if (session.mode === 'subscription' && session.subscription) {
        // Handle subscription verification
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        console.log('Subscription details:', {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end
        });

        // Check if subscription record exists
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!existingSubscription) {
          // Create subscription record if it doesn't exist
          console.log('Creating missing subscription record...');
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .insert([
              {
                user_id: userId,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer,
                status: subscription.status,
                current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
                current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
                plan_type: session.metadata?.planType || 'unknown',
                price_id: subscription.items.data[0]?.price?.id
              }
            ]);

          if (subscriptionError) {
            console.error('Error creating subscription record:', subscriptionError);
          }
        }

        // Update user profile to premium if subscription is active
        const isPremium = ['active', 'trialing'].includes(subscription.status);
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: userId,
              is_premium: isPremium,
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
          return res.status(500).json({ 
            success: false, 
            message: 'Error updating user profile',
            error: profileError 
          });
        }

        console.log('User profile updated:', profileData);
        
        return res.json({ 
          success: true, 
          isPaid: isPremium,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          message: 'Subscription verified and profile updated' 
        });
      } else {
        // Handle legacy one-time payment verification (for backward compatibility)
        console.log('Processing legacy one-time payment...');
        
        // Check if payment record exists
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_id', session.payment_intent)
          .single();

        if (!existingPayment) {
          // Create payment record if it doesn't exist
          console.log('Creating missing payment record...');
          const { error: paymentError } = await supabase
            .from('payments')
            .insert([
              {
                user_id: userId,
                stripe_payment_id: session.payment_intent,
                amount: session.amount_total / 100,
                status: 'succeeded'
              }
            ]);

          if (paymentError) {
            console.error('Error creating payment record:', paymentError);
          }
        }

        // Update user profile to premium
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: userId,
              is_premium: true,
              premium_since: new Date().toISOString()
            },
            {
              onConflict: 'user_id'
            }
          )
          .select();

        if (profileError) {
          console.error('Error updating user profile:', profileError);
          return res.status(500).json({ 
            success: false, 
            message: 'Error updating user profile',
            error: profileError 
          });
        }

        console.log('User profile updated to premium:', profileData);
        
        return res.json({ 
          success: true, 
          isPaid: true, 
          message: 'Payment verified and profile updated' 
        });
      }
    } else {
      console.log('Payment not confirmed:', {
        payment_status: session.payment_status,
        client_reference_id: session.client_reference_id,
        expected_user_id: userId
      });
      
      return res.json({ 
        success: true, 
        isPaid: false, 
        message: 'Payment not confirmed or user ID mismatch' 
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error verifying payment',
      error: error.message 
    });
  }
} 