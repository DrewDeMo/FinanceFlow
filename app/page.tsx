'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { TrendingUp, DollarSign, PieChart, Clock } from 'lucide-react';

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
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Animated gradient orbs for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 dark:bg-indigo-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:py-20 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          {/* Hero Content */}
          <div className="flex-1 space-y-8 animate-slide-up">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="gradient-text">Master Your Finances</span>
                <br />
                <span className="text-foreground">with Intelligence</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
                Import your bank statements, automatically categorize transactions,
                track recurring bills, and achieve your financial goals.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
              {/* Feature Card 1 */}
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-100 dark:border-purple-900/50 hover-lift hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Smart CSV Import
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Automatic duplicate detection and merchant name cleaning
                  </p>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-900/50 hover-lift hover:shadow-lg hover:border-green-200 dark:hover:border-green-800 transition-all duration-200">
                <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200">
                  <PieChart className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Auto-Categorization
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI-powered rules that learn from your edits
                  </p>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-100 dark:border-orange-900/50 hover-lift hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-200">
                <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    Bill Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Never miss a payment with smart due date detection
                  </p>
                </div>
              </div>

              {/* Feature Card 4 */}
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-100 dark:border-violet-900/50 hover-lift hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200">
                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-200">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    Financial Goals
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Set targets and track progress with visual insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Auth Forms */}
          <div className="flex-shrink-0 w-full max-w-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
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
