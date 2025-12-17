'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Home,
  CreditCard,
  ArrowUpFromLine,
  Repeat,
  Receipt,
  Target,
  Settings,
  LogOut,
  Sparkles,
  Filter,
  Sun,
  Moon,
  ChevronRight,
  FolderKanban,
} from 'lucide-react';

const navItems = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: Home,
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    name: 'Transactions',
    href: '/dashboard/transactions',
    icon: CreditCard,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Categories',
    href: '/dashboard/categories',
    icon: FolderKanban,
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Import Data',
    href: '/dashboard/import',
    icon: ArrowUpFromLine,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Recurring',
    href: '/dashboard/recurring',
    icon: Repeat,
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    name: 'Bills',
    href: '/dashboard/bills',
    icon: Receipt,
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    name: 'Goals',
    href: '/dashboard/goals',
    icon: Target,
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    name: 'Rules',
    href: '/dashboard/rules',
    icon: Filter,
    gradient: 'from-fuchsia-500 to-purple-500',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    gradient: 'from-slate-500 to-gray-500',
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Glassmorphism Background with Animated Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-black dark:via-slate-950 dark:to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 backdrop-blur-3xl" />

      {/* Border with gradient */}
      <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-slate-700/50 to-transparent" />

      <div className="relative flex flex-col h-full">
        {/* Brand Section */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl shadow-xl">
                <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent tracking-tight">
                FinanceFlow
              </h1>
              <p className="text-xs text-slate-500 font-medium">Financial Management</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-400 mb-0.5">Logged in as</p>
                <p className="text-sm text-white truncate font-medium">{user.email}</p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 group"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4 transition-transform group-hover:rotate-12" />
                ) : (
                  <Moon className="h-4 w-4 transition-transform group-hover:-rotate-12" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 overflow-y-auto">
          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      'group relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300',
                      isActive
                        ? 'bg-white/[0.08] text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    )}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-10 from-transparent via-white to-transparent" />
                    )}

                    {/* Icon with gradient background */}
                    <div className={cn(
                      'relative p-2 rounded-xl transition-all duration-300',
                      isActive
                        ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                        : 'bg-white/[0.03] group-hover:bg-white/[0.06]'
                    )}>
                      <Icon
                        className={cn(
                          'h-4 w-4 transition-all duration-300',
                          isActive
                            ? 'text-white scale-110'
                            : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                        )}
                        strokeWidth={2.5}
                      />
                    </div>

                    <span className={cn(
                      'flex-1 transition-all duration-300',
                      isActive ? 'font-semibold' : 'font-medium'
                    )}>
                      {item.name}
                    </span>

                    {/* Arrow indicator */}
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-all duration-300',
                        isActive
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
                      )}
                    />

                    {/* Glow effect on hover */}
                    <div className={cn(
                      'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300',
                      !isActive && 'group-hover:opacity-100',
                      `bg-gradient-to-r ${item.gradient} blur-xl -z-10`
                    )} style={{ opacity: isActive ? 0 : undefined }} />
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sign Out Section */}
        <div className="p-3 mt-auto">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-xl mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Status: Active</span>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300 rounded-2xl p-3 h-auto group"
            onClick={signOut}
          >
            <div className="p-2 rounded-xl bg-white/[0.03] group-hover:bg-red-500/10 transition-all duration-300 mr-3">
              <LogOut className="h-4 w-4 group-hover:text-red-400 transition-colors duration-300" strokeWidth={2.5} />
            </div>
            <span className="font-medium group-hover:text-red-400 transition-colors duration-300">Sign Out</span>
            <ChevronRight className="h-4 w-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </Button>
        </div>
      </div>
    </div>
  );
}
