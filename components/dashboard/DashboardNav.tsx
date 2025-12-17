'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  RefreshCw,
  Receipt,
  Target,
  Settings,
  LogOut,
  Tags,
  Zap,
  ChevronRight,
} from 'lucide-react';

const navSections = [
  {
    title: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'Transactions',
        href: '/dashboard/transactions',
        icon: ArrowLeftRight,
      },
      {
        name: 'Categories',
        href: '/dashboard/categories',
        icon: Tags,
      },
    ],
  },
  {
    title: 'Manage',
    items: [
      {
        name: 'Import',
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
        icon: Receipt,
      },
      {
        name: 'Goals',
        href: '/dashboard/goals',
        icon: Target,
      },
      {
        name: 'Rules',
        href: '/dashboard/rules',
        icon: Zap,
      },
    ],
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border/50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-primary-foreground"
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
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">
              FinanceFlow
            </h1>
            <p className="text-xs text-muted-foreground">Personal Finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] flex-shrink-0 transition-transform duration-150',
                          !active && 'group-hover:scale-105'
                        )}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                      {active && (
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-border/50">
        {/* Settings */}
        <div className="px-3 py-3">
          <Link href="/dashboard/settings">
            <div
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive('/dashboard/settings')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Settings
                className="h-[18px] w-[18px] flex-shrink-0"
                strokeWidth={isActive('/dashboard/settings') ? 2.5 : 2}
              />
              <span className="flex-1">Settings</span>
            </div>
          </Link>
        </div>

        {/* User Section */}
        {user && (
          <div className="px-4 py-4 border-t border-border/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors duration-150"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
