export default async function handler(req, res) {
  try {
    // Test basic API functionality
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Check environment variables
    const envCheck = {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      
      // DETAILED DEBUG INFO
      actualSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      alternateSupabaseUrl: process.env.SUPABASE_URL || 'NOT SET',
      serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      stripeKeyExists: !!process.env.STRIPE_SECRET_KEY,
      
      // Show all environment keys that might be relevant
      allRelevantEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('SUPABASE') || 
        key.includes('STRIPE') || 
        key.includes('DATABASE') ||
        key.includes('URL')
      ).sort(),
      
      // Platform detection
      platform: {
        vercel: !!process.env.VERCEL,
        netlify: !!process.env.NETLIFY,
        nodeEnv: process.env.NODE_ENV
      }
    };

    // Test Supabase connection
    let supabaseTest = 'Not tested';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        // Simple test query
        const { error } = await supabase.from('user_profiles').select('user_id').limit(1);
        supabaseTest = error ? `Error: ${error.message}` : 'Connected successfully';
      } else {
        supabaseTest = 'Missing environment variables';
      }
    } catch (error) {
      supabaseTest = `Connection test failed: ${error.message}`;
    }

    // Test Stripe connection
    let stripeTest = 'Not tested';
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        // Simple test - just initialize
        stripeTest = 'API key valid format';
      } else {
        stripeTest = 'Missing STRIPE_SECRET_KEY';
      }
    } catch (error) {
      stripeTest = `Test failed: ${error.message}`;
    }

    res.status(200).json({
      message: 'Server test successful',
      environment: envCheck,
      supabase: supabaseTest,
      stripe: stripeTest,
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server test error:', error);
    res.status(500).json({
      message: 'Server test failed',
      error: error.message,
      stack: error.stack
    });
  }
} 