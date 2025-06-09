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

  console.log('Webhook received:', req.body);

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('Event constructed successfully:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Processing completed checkout session:', {
      userId: session.client_reference_id,
      paymentIntent: session.payment_intent,
      amount: session.amount_total
    });
    
    try {
      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            user_id: session.client_reference_id,
            stripe_payment_id: session.payment_intent,
            amount: session.amount_total / 100, // Convert from cents to dollars
            status: 'succeeded'
          }
        ])
        .select();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        return res.status(500).json({ message: 'Error creating payment record' });
      }

      console.log('Payment record created:', paymentData);

      // Update or create user profile with premium status
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: session.client_reference_id,
            is_premium: true,
            premium_since: new Date().toISOString()
          },
          {
            onConflict: 'user_id',
            returning: true
          }
        );

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        return res.status(500).json({ message: 'Error updating user profile' });
      }

      console.log('Profile updated:', profileData);
      console.log('Payment and profile update completed successfully');
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ message: 'Error processing webhook' });
    }
  }

  res.json({ received: true });
} 