import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2023-10-16',
});

// Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase env vars not set:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
}

const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

const PRICE_IDS: Record<string, string> = {
  trial: process.env.STRIPE_TRIAL_PRICE_ID || 'price_1Sx6AEJumDxkCsW5CqIepaxe',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_1Sx64CJumDxkCsW5vV3Rm1vN',
  team: process.env.STRIPE_TEAM_PRICE_ID || 'price_1Sx661JumDxkCsW5CUQxpn1I',
};

export async function POST(request: NextRequest) {
  try {
    console.log('Checkout request received');
    console.log('Price IDs:', PRICE_IDS);
    
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User:', user.id);

    const { planId } = await request.json();
    console.log('Plan ID:', planId);

    if (!planId || !PRICE_IDS[planId]) {
      console.log('Invalid plan:', planId, 'Available:', Object.keys(PRICE_IDS));
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();
    
    console.log('Subscription query:', { subscription, error: subError });

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log('Creating new Stripe customer for:', user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('Created customer:', customerId);

      // Save customer ID to database
      const { error: upsertError } = await supabaseAdmin.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_id: 'free',
        status: 'active',
        updated_at: new Date().toISOString(),
      });
      
      if (upsertError) {
        console.log('Upsert error:', upsertError);
      }
    }

    console.log('Creating checkout session with price:', PRICE_IDS[planId]);
    
    // Get APP URL - clean any newlines
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frontend-lyart-nine-90lbels2xz.vercel.app';
    appUrl = appUrl.trim().replace(/[\r\n]/g, '');
    console.log('APP_URL:', appUrl);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[planId],
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    console.log('Session created:', session.id, session.url);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error?.message || error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout session', details: error?.type },
      { status: 500 }
    );
  }
}
