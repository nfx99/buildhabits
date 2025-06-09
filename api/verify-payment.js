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

    console.log('Verifying payment for session:', sessionId, 'user:', userId);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Stripe session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      client_reference_id: session.client_reference_id,
      amount_total: session.amount_total
    });

    // Check if payment was successful and user ID matches
    if (session.payment_status === 'paid' && session.client_reference_id === userId) {
      console.log('Payment confirmed by Stripe, updating user profile...');
      
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