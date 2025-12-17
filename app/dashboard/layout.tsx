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
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex w-64 flex-shrink-0">
          <DashboardNav />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
