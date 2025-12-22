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
        <DashboardNav className="hidden md:flex w-64 flex-shrink-0" />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-auto min-w-0">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
