'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { TrendingUp, Wallet, PieChart, Zap } from 'lucide-react';

const features = [
  {
    icon: Wallet,
    title: 'Smart Import',
    description: 'Import CSV files with automatic duplicate detection',
  },
  {
    icon: PieChart,
    title: 'Auto-Categorize',
    description: 'AI-powered transaction categorization',
  },
  {
    icon: Zap,
    title: 'Bill Tracking',
    description: 'Never miss a payment deadline',
  },
  {
    icon: TrendingUp,
    title: 'Goals',
    description: 'Track progress towards your targets',
  },
];

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24">
          {/* Left side - Branding and features */}
          <div className="flex-1 max-w-xl">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-6 h-6 text-primary-foreground"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                  />
                </svg>
              </div>
              <span className="text-xl font-semibold text-foreground">FinanceFlow</span>
            </div>

            {/* Hero text */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight mb-4">
                Take control of your finances
              </h1>
              <p className="text-lg text-muted-foreground">
                Import your bank statements, track expenses, and achieve your financial goals — all in one place.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right side - Auth form */}
          <div className="w-full max-w-sm">
            {isLogin ? (
              <LoginForm onToggleMode={() => setIsLogin(false)} />
            ) : (
              <SignupForm onToggleMode={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
