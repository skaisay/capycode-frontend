import { getSupabaseClient } from './supabase';

// Stripe configuration
export const STRIPE_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'EUR',
    priceId: null,
    features: [
      '3 AI generations per day',
      '1 active project',
      'Basic templates',
      'Community support',
    ],
    limits: {
      generationsPerDay: 3,
      maxProjects: 1,
      exportEnabled: false,
      prioritySupport: false,
    }
  },
  trial: {
    id: 'trial',
    name: 'Trial',
    price: 1,
    currency: 'EUR',
    period: 'week',
    priceId: process.env.STRIPE_TRIAL_PRICE_ID || 'price_1Sx6AEJumDxkCsW5CqIepaxe',
    features: [
      '10 AI generations',
      '3 active projects',
      'All templates',
      'Code export',
      '1 week access',
    ],
    limits: {
      generationsPerDay: 10,
      maxProjects: 3,
      exportEnabled: true,
      prioritySupport: false,
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    currency: 'EUR',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_1Sx64CJumDxkCsW5vV3Rm1vN',
    features: [
      'Unlimited AI generations',
      'Unlimited projects',
      'All premium templates',
      'Code export',
      'Priority support',
      'Custom components',
    ],
    limits: {
      generationsPerDay: -1, // unlimited
      maxProjects: -1,
      exportEnabled: true,
      prioritySupport: true,
    }
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 49,
    currency: 'EUR',
    priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_1Sx661JumDxkCsW5CUQxpn1I',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Shared projects',
      'Admin dashboard',
      'API access',
      'Custom AI models',
      'SLA guarantee',
    ],
    limits: {
      generationsPerDay: -1,
      maxProjects: -1,
      exportEnabled: true,
      prioritySupport: true,
      teamMembers: 10,
      apiAccess: true,
    }
  }
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  generations_today: number;
  generations_this_month: number;
  projects_count: number;
}

// Get user's current subscription
export async function getUserSubscription(): Promise<UserSubscription | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    // Return free plan as default
    return {
      id: 'default',
      user_id: user.id,
      plan_id: 'free',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return data;
}

// Get user's usage stats
export async function getUsageStats(): Promise<UsageStats> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { generations_today: 0, generations_this_month: 0, projects_count: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get generation counts
  const { data: statsData } = await supabase
    .from('generation_logs')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', monthStart.toISOString());

  const generations = statsData || [];
  const generationsToday = generations.filter(g => 
    new Date(g.created_at) >= today
  ).length;

  // Get projects count
  const { count: projectsCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return {
    generations_today: generationsToday,
    generations_this_month: generations.length,
    projects_count: projectsCount || 0,
  };
}

// Check if user can generate
export async function canGenerate(): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getUserSubscription();
  const usage = await getUsageStats();
  const plan = STRIPE_PLANS[subscription?.plan_id || 'free'];

  if (plan.limits.generationsPerDay === -1) {
    return { allowed: true };
  }

  if (usage.generations_today >= plan.limits.generationsPerDay) {
    return { 
      allowed: false, 
      reason: `Daily limit reached (${plan.limits.generationsPerDay} generations). Upgrade to Pro for unlimited.` 
    };
  }

  return { allowed: true };
}

// Check if user can create project
export async function canCreateProject(): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getUserSubscription();
  const usage = await getUsageStats();
  const plan = STRIPE_PLANS[subscription?.plan_id || 'free'];

  if (plan.limits.maxProjects === -1) {
    return { allowed: true };
  }

  if (usage.projects_count >= plan.limits.maxProjects) {
    return { 
      allowed: false, 
      reason: `Project limit reached (${plan.limits.maxProjects} project). Upgrade to Pro for unlimited projects.` 
    };
  }

  return { allowed: true };
}

// Log generation for rate limiting and history
export async function logGeneration(prompt?: string, status: 'completed' | 'failed' | 'cancelled' = 'completed'): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase.from('generation_logs').insert({
    user_id: user.id,
    prompt: prompt || 'AI Generation',
    status: status,
    credits_used: 0.10,
    created_at: new Date().toISOString(),
  });
}

// Create checkout session (to be called from API route)
export function getCheckoutUrl(planId: PlanId): string {
  return `/api/stripe/checkout?plan=${planId}`;
}

// Create customer portal URL (to be called from API route)  
export function getCustomerPortalUrl(): string {
  return '/api/stripe/portal';
}

// Format price display
export function formatPrice(price: number, currency: string = 'EUR'): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

// Get plan by ID
export function getPlan(planId: PlanId) {
  return STRIPE_PLANS[planId];
}

// Get generation history for DevTools
export interface GenerationHistoryEntry {
  id: string;
  prompt: string;
  timestamp: Date;
  status: 'completed' | 'failed' | 'cancelled';
  creditsUsed: number;
}

export async function getGenerationHistory(limit: number = 20): Promise<GenerationHistoryEntry[]> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('generation_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map(entry => ({
    id: entry.id,
    prompt: entry.prompt || 'Generation',
    timestamp: new Date(entry.created_at),
    status: entry.status || 'completed',
    creditsUsed: entry.credits_used || 0.10,
  }));
}

// Get credits info for current plan
export function getCreditsForPlan(planId: PlanId): { used: number; total: number; plan: string } {
  const plan = STRIPE_PLANS[planId];
  const dailyLimit = plan.limits.generationsPerDay;
  
  return {
    used: 0, // Will be calculated from usage
    total: dailyLimit === -1 ? 999 : dailyLimit, // Unlimited shows as high number
    plan: plan.name,
  };
}
