import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClientProviders } from '@/components/providers/ClientProviders';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FinanceFlow - Personal Finance Management',
  description: 'Manage your finances with smart CSV imports, automatic categorization, and bill tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
