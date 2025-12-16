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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-slate-900 tracking-tight">
                Master Your Finances with Intelligence
              </h1>
              <p className="text-xl text-slate-600">
                Import your bank statements, automatically categorize transactions,
                track recurring bills, and achieve your financial goals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Smart CSV Import</h3>
                  <p className="text-sm text-slate-600">
                    Automatic duplicate detection and merchant name cleaning
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <PieChart className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Auto-Categorization</h3>
                  <p className="text-sm text-slate-600">
                    AI-powered rules that learn from your edits
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Bill Tracking</h3>
                  <p className="text-sm text-slate-600">
                    Never miss a payment with smart due date detection
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Financial Goals</h3>
                  <p className="text-sm text-slate-600">
                    Set targets and track progress with visual insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-full max-w-md">
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
