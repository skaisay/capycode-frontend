'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User, LogOut, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

interface UserData {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface HeaderProps {
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
  currentPage?: string;
}

export default function Header({ showBack, backTo = '/dashboard', backLabel = 'Back' }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name,
          avatar_url: authUser.user_metadata?.avatar_url,
        });
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Blur background with gradient fade */}
      <div 
        className="absolute inset-x-0 top-0 h-24 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.8) 60%, rgba(10,10,11,0.4) 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        }}
      />
      
      <div className="relative max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <>
              <Link 
                href={backTo}
                className="flex items-center gap-2 text-[#6b6b70] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">{backLabel}</span>
              </Link>
              <div className="w-px h-6 bg-[#1f1f23]" />
            </>
          )}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="CapyCode" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-semibold text-white">CapyCode</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/features" className="text-white/50 hover:text-white transition-colors text-sm">Features</Link>
          <Link href="/pricing" className="text-white/50 hover:text-white transition-colors text-sm">Pricing</Link>
          <Link href="/docs" className="text-white/50 hover:text-white transition-colors text-sm">Docs</Link>
        </nav>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-20 h-8 bg-white/5 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard" 
                className="text-white/50 hover:text-white transition-colors text-sm flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </button>
                
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#111113] border border-[#1f1f23] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-3 border-b border-[#1f1f23]">
                    <p className="text-sm text-white font-medium truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs text-[#6b6b70] truncate">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-[#9a9aa0] hover:text-white hover:bg-[#1f1f23] rounded-lg transition-colors">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[#1f1f23] rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="text-white/50 hover:text-white transition-colors text-sm">Log in</Link>
              <Link 
                href="/auth/signup" 
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
