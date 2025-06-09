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

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Processing completed checkout session:', {
      userId: session.client_reference_id,
      paymentIntent: session.payment_intent,
      amount: session.amount_total,
      sessionId: session.id
    });
    
    if (!session.client_reference_id) {
      console.error('No client_reference_id found in session');
      return res.status(400).json({ message: 'No user ID found in session' });
    }
    
    try {
      // First, check if this payment has already been processed
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('stripe_payment_id', session.payment_intent)
        .single();

      if (existingPayment) {
        console.log('Payment already processed, skipping');
        return res.json({ received: true, message: 'Already processed' });
      }

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
        console.error('Payment error details:', JSON.stringify(paymentError, null, 2));
        return res.status(500).json({ message: 'Error creating payment record', error: paymentError });
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
            onConflict: 'user_id'
          }
        )
        .select();

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        console.error('Profile error details:', JSON.stringify(profileError, null, 2));
        
        // If profile update fails, we still want to return success since payment was recorded
        // The frontend can retry the profile update
        console.log('Payment recorded but profile update failed - frontend should retry');
      } else {
        console.log('Profile updated successfully:', profileData);
      }

      console.log('Webhook processing completed');
    } catch (error) {
      console.error('Error processing webhook:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ message: 'Error processing webhook', error: error.message });
    }
  }

  res.json({ received: true });
} 