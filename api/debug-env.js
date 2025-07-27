export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get all environment variables that might be relevant
    const envVars = {
      // Supabase variables
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      
      // Stripe variables
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ? 'SET' : 'MISSING',
      
      // Node environment
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      NETLIFY: process.env.NETLIFY,
      
      // All environment variable names (for debugging)
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('SUPABASE') || 
        key.includes('STRIPE') || 
        key.includes('DATABASE') ||
        key.includes('URL')
      ).sort()
    };

    // Attempt Supabase connection
    let supabaseTest = 'Not attempted';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (url && key) {
        console.log('🔍 Attempting Supabase connection with:', {
          url: url.substring(0, 20) + '...', 
          keyExists: !!key
        });
        
        const supabase = createClient(url, key);
        const { error } = await supabase.from('user_profiles').select('user_id').limit(1);
        supabaseTest = error ? `Connection error: ${error.message}` : 'Connection successful';
      } else {
        supabaseTest = 'Missing credentials';
      }
    } catch (error) {
      supabaseTest = `Test failed: ${error.message}`;
    }

    res.status(200).json({
      message: 'Environment diagnostic complete',
      environment: envVars,
      supabaseConnectionTest: supabaseTest,
      serverTime: new Date().toISOString(),
      platform: {
        isVercel: !!process.env.VERCEL,
        isNetlify: !!process.env.NETLIFY,
        nodeVersion: process.version
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      message: 'Debug endpoint failed',
      error: error.message,
      stack: error.stack
    });
  }
} 