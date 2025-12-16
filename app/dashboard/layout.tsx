'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Sidebar Navigation */}
        <aside className="w-64 flex-shrink-0 shadow-xl">
          <DashboardNav />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full bg-gradient-to-br from-transparent via-white/50 to-transparent dark:from-transparent dark:via-slate-900/50 dark:to-transparent">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
