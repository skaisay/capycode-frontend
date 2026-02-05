'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /profile to /dashboard
export default function ProfileRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
