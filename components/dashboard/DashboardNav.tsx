'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Upload,
  RefreshCw,
  FileCheck,
  Target,
  Settings,
  LogOut,
  TrendingUp,
  Sliders,
} from 'lucide-react';

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Transactions',
    href: '/dashboard/transactions',
    icon: FileText,
  },
  {
    name: 'Import CSV',
    href: '/dashboard/import',
    icon: Upload,
  },
  {
    name: 'Recurring',
    href: '/dashboard/recurring',
    icon: RefreshCw,
  },
  {
    name: 'Bills',
    href: '/dashboard/bills',
    icon: FileCheck,
  },
  {
    name: 'Goals',
    href: '/dashboard/goals',
    icon: Target,
  },
  {
    name: 'Rules',
    href: '/dashboard/rules',
    icon: Sliders,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-emerald-400" />
          <h1 className="text-2xl font-bold">FinanceFlow</h1>
        </div>
        {user && (
          <p className="text-sm text-slate-400 mt-2 truncate">{user.email}</p>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
