'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles, Zap, Crown, Loader2, Gift } from 'lucide-react';
import Header from '@/components/Header';
import { getSupabaseClient } from '@/lib/supabase';
import { getUserSubscription, STRIPE_PLANS, PlanId } from '@/lib/stripe';
import toast from 'react-hot-toast';

const plans = [
  {
    id: 'free' as PlanId,
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for trying out CapyCode',
    icon: Sparkles,
    gradient: 'from-gray-500 to-gray-600',
    features: STRIPE_PLANS.free.features,
    limitations: [
      'Basic AI model',
      'No team collaboration',
    ],
    popular: false,
  },
  {
    id: 'trial' as PlanId,
    name: 'Trial',
    price: 1,
    period: '/week',
    description: 'Test all features for just €1',
    icon: Gift,
    gradient: 'from-orange-500 to-amber-600',
    features: STRIPE_PLANS.trial.features,
    limitations: [],
    popular: false,
    badge: '🔥 Best Value',
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    price: 19,
    period: '/month',
    description: 'For serious app developers',
    icon: Zap,
    gradient: 'from-emerald-500 to-teal-600',
    features: STRIPE_PLANS.pro.features,
    limitations: [],
    popular: true,
  },
  {
    id: 'team' as PlanId,
    name: 'Team',
    price: 49,
    period: '/month',
    description: 'For teams and agencies',
    icon: Crown,
    gradient: 'from-violet-500 to-purple-600',
    features: STRIPE_PLANS.team.features,
    limitations: [],
    popular: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsLoggedIn(true);
        const subscription = await getUserSubscription();
        if (subscription) {
          setCurrentPlan(subscription.plan_id);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleUpgrade = async (planId: PlanId) => {
    if (planId === 'free') {
      router.push('/auth/signup');
      return;
    }

    if (!isLoggedIn) {
      router.push(`/auth/signup?plan=${planId}`);
      return;
    }

    if (planId === currentPlan) {
      toast.success('You are already on this plan');
      return;
    }

    setLoading(planId);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const { url, error } = await res.json();
      
      if (error) {
        throw new Error(error);
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (planId: PlanId) => {
    if (currentPlan === planId) return 'Current Plan';
    if (planId === 'free') return 'Get Started';
    if (!isLoggedIn) return 'Start Free Trial';
    return 'Upgrade Now';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[100px]" />
      </div>

      {/* Header */}
      <Header showBack backTo="/dashboard" backLabel="Dashboard" />

      <main className="relative z-10 pt-20">
        {/* Hero */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-semibold mb-6 text-white">
                Simple, transparent{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  pricing
                </span>
              </h1>
              <p className="text-lg text-white/50 max-w-xl mx-auto mb-8">
                Start for free. Upgrade when you're ready. Cancel anytime.
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center gap-3 bg-[#111113] border border-[#1f1f23] rounded-xl p-1">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !isAnnual ? 'bg-[#1f1f23] text-white' : 'text-[#6b6b70]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isAnnual ? 'bg-[#1f1f23] text-white' : 'text-[#6b6b70]'
                  }`}
                >
                  Annual
                  <span className="ml-2 text-emerald-400 text-xs">Save 20%</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative p-8 bg-[#111113]/80 backdrop-blur-xl border rounded-2xl ${
                    plan.popular
                      ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                      : 'border-[#1f1f23]/50'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                      Most Popular
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-5`}>
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-[#6b6b70] text-sm mb-4">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-white">
                      €{isAnnual && plan.price > 0
                        ? Math.round(plan.price * 0.8)
                        : plan.price}
                    </span>
                    <span className="text-[#6b6b70]">{plan.period}</span>
                  </div>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id || currentPlan === plan.id}
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 ${
                      plan.popular
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : currentPlan === plan.id
                        ? 'bg-[#1f1f23] text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1f1f23] hover:bg-[#2a2a2e] text-white'
                    }`}
                  >
                    {loading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {getButtonText(plan.id)}
                        {currentPlan !== plan.id && <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>

                  <div className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-white/80 text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation) => (
                      <div key={limitation} className="flex items-start gap-3 opacity-50">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4a4a4e]" />
                        </div>
                        <span className="text-white/50 text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-6 border-t border-[#1f1f23]/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-center text-white mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Can I cancel anytime?',
                  a: 'Yes! You can cancel your subscription at any time. Your access will continue until the end of your billing period.',
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal.',
                },
                {
                  q: 'Do I own the code I generate?',
                  a: 'Absolutely! All code generated is 100% yours. Export and use it however you want.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'The Free plan is essentially a forever-free trial. Pro plans also come with a 14-day money-back guarantee.',
                },
              ].map((faq) => (
                <div
                  key={faq.q}
                  className="p-6 bg-[#111113]/80 backdrop-blur-xl border border-[#1f1f23]/50 rounded-xl"
                >
                  <h3 className="text-white font-medium mb-2">{faq.q}</h3>
                  <p className="text-[#6b6b70] text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-[#1f1f23]/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="CapyCode" width={20} height={20} className="rounded" />
            <span className="text-sm font-medium text-white">CapyCode</span>
          </div>
          <div className="flex items-center gap-6 text-white/30 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <p className="text-white/20 text-xs">© 2026 CapyCode</p>
        </div>
      </footer>
    </div>
  );
}
