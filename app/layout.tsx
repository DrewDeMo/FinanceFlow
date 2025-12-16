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
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 flex-shrink-0">
          <DashboardNav />
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
