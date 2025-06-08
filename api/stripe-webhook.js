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

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Create payment record
      const { error } = await supabase
        .from('payments')
        .insert([
          {
            user_id: session.client_reference_id,
            stripe_payment_id: session.payment_intent,
            amount: session.amount_total / 100, // Convert from cents to dollars
            status: 'succeeded'
          }
        ]);

      if (error) {
        console.error('Error creating payment record:', error);
        return res.status(500).json({ message: 'Error creating payment record' });
      }

      console.log('Payment record created successfully');
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ message: 'Error processing webhook' });
    }
  }

  res.json({ received: true });
} 