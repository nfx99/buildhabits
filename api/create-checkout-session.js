import Stripe from 'stripe';

// Initialize Stripe with optimized configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 2,
  timeout: 8000, // 8 second timeout
});

export default async function handler(req, res) {
  // Set performance headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { userId, priceId } = req.body;

    if (!userId || !priceId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ message: 'Payment system not configured' });
    }

    console.log('Creating checkout session for:', { userId, priceId });

    // Use your actual domain or fallback to localhost for development
    const baseUrl = process.env.BASE_URL || process.env.REACT_APP_BASE_URL || 'https://buildhabits.net';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      client_reference_id: userId,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Checkout session created: ${session.id} (${duration}ms)`);

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more specific error messages
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        message: 'Invalid payment configuration', 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
} 